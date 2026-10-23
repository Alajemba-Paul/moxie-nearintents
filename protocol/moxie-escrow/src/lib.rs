//! Moxie escrow.
//!
//! Solana only ever sees a commitment. The market id, outcome token, slippage,
//! reference ask, and Polygon recipient stay off the lock transaction so the
//! public mempool cannot front-run the intent. The solver learns the preimage
//! on a private bus. `record_clob_fill` reveals it, checks the hash, and only
//! then can `settle_release` pay the solver.
//!
//! Replay protection is the escrow PDA `["escrow", taker, nonce]`. Re-locking
//! the same nonce fails account init (`already in use`), which clients map to
//! `Replay`. A refund or a settlement does not clear that account.
//!
//! Commitment layout, little-endian, matching `encodeIntent` in
//! `src/lib/moxie/codec.ts`:
//! `b"moxie.intent.v1" || taker || nonce || size || expiry || u32 market_len ||
//! market || outcome_token[32] || slippage u16 || polygon_recipient[20] ||
//! reference_ask`.
//!
//! Solver authorization, checked against the preceding Ed25519 program
//! instruction: `b"moxie.solver-auth.v1" || commitment || solver_pubkey`.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::ed25519_program;
use anchor_lang::solana_program::hash::hash;
use anchor_lang::solana_program::sysvar::instructions::{
    load_current_index_checked, load_instruction_at_checked, ID as IX_SYSVAR_ID,
};
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("Fp8YfZhD52nPSvagqpVD9gDwMvQ7d1a2K7JXkDL3HMUV");

pub const INTENT_DOMAIN: &[u8] = b"moxie.intent.v1";
pub const SOLVER_AUTH_DOMAIN: &[u8] = b"moxie.solver-auth.v1";

#[program]
pub mod moxie_escrow {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>, usdc_mint: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.usdc_mint = usdc_mint;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    /// Lock USDC against an opaque commitment. Instruction data has no market.
    pub fn lock_intent(ctx: Context<LockIntent>, args: LockArgs) -> Result<()> {
        require!(args.size_usdc > 0, MoxieError::ZeroSize);
        require!(args.commitment != [0u8; 32], MoxieError::IntentIncomplete);
        let clock = Clock::get()?;
        require!(args.expiry_ts > clock.unix_timestamp, MoxieError::Expired);

        let escrow = &mut ctx.accounts.escrow;
        escrow.taker = ctx.accounts.taker.key();
        escrow.solver = Pubkey::default();
        escrow.phase = Phase::EscrowLocked;
        escrow.nonce = args.nonce;
        escrow.size_usdc = args.size_usdc;
        escrow.expiry_ts = args.expiry_ts;
        escrow.commitment = args.commitment;
        escrow.fill_usdc = 0;
        escrow.shares = 0;
        escrow.polygon_tx = [0u8; 32];
        escrow.quote_price_micro = 0;
        escrow.reference_ask_micro = 0;
        escrow.max_slippage_bps = 0;
        escrow.polygon_recipient = [0u8; 20];
        escrow.bump = ctx.bumps.escrow;
        escrow.vault_bump = ctx.bumps.vault;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.taker_usdc.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.taker.to_account_info(),
                },
            ),
            args.size_usdc,
        )?;

        emit!(IntentLocked {
            taker: escrow.taker,
            nonce: escrow.nonce,
            size_usdc: escrow.size_usdc,
            expiry_ts: escrow.expiry_ts,
            commitment: escrow.commitment,
        });
        Ok(())
    }

    /// Bind one solver. Requires a prior Ed25519-program verify of the taker.
    pub fn record_solver_match(ctx: Context<RecordSolverMatch>, signature: [u8; 64]) -> Result<()> {
        let taker = ctx.accounts.escrow.taker;
        let commitment = ctx.accounts.escrow.commitment;
        {
            let escrow = &ctx.accounts.escrow;
            require!(
                escrow.phase == Phase::EscrowLocked,
                MoxieError::InvalidTransition
            );
            let clock = Clock::get()?;
            require!(clock.unix_timestamp < escrow.expiry_ts, MoxieError::Expired);
        }

        let mut message = Vec::with_capacity(SOLVER_AUTH_DOMAIN.len() + 32 + 32);
        message.extend_from_slice(SOLVER_AUTH_DOMAIN);
        message.extend_from_slice(&commitment);
        message.extend_from_slice(ctx.accounts.solver.key().as_ref());
        verify_prior_ed25519(
            &ctx.accounts.ix_sysvar,
            taker.as_ref(),
            &message,
            &signature,
        )?;

        let escrow = &mut ctx.accounts.escrow;
        escrow.solver = ctx.accounts.solver.key();
        escrow.phase = Phase::SolverMatched;
        emit!(SolverMatchedEvt {
            taker: escrow.taker,
            nonce: escrow.nonce,
            solver: escrow.solver,
            commitment: escrow.commitment,
        });
        Ok(())
    }

    /// Reveal the intent, check it matches the commitment, record the fill.
    pub fn record_clob_fill(ctx: Context<RecordClobFill>, args: FillArgs) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(
            escrow.phase == Phase::SolverMatched,
            MoxieError::InvalidTransition
        );
        require!(
            ctx.accounts.solver.key() == escrow.solver,
            MoxieError::Unauthorized
        );
        let clock = Clock::get()?;
        require!(clock.unix_timestamp < escrow.expiry_ts, MoxieError::Expired);
        require!(
            !args.market_id.is_empty() && args.market_id.len() <= 64,
            MoxieError::IntentIncomplete
        );
        require!(args.max_slippage_bps <= 10_000, MoxieError::IntentIncomplete);
        require!(args.reference_ask_micro > 0, MoxieError::IntentIncomplete);
        require!(args.quote_price_micro > 0, MoxieError::IntentIncomplete);
        require!(
            args.fill_usdc > 0 && args.fill_usdc <= escrow.size_usdc,
            MoxieError::ProofMismatch
        );
        require!(args.shares > 0, MoxieError::ProofMismatch);
        require!(args.polygon_tx != [0u8; 32], MoxieError::ProofMismatch);

        let expected = intent_commitment(
            escrow.taker.as_ref(),
            escrow.nonce,
            escrow.size_usdc,
            escrow.expiry_ts,
            &args,
        )?;
        require!(expected == escrow.commitment, MoxieError::ProofMismatch);

        let ceiling = max_price(args.reference_ask_micro, args.max_slippage_bps)?;
        require!(
            args.quote_price_micro <= ceiling,
            MoxieError::SlippageExceeded
        );
        let expected_shares = (args.fill_usdc as u128)
            .checked_mul(1_000_000)
            .ok_or(MoxieError::Overflow)?
            / (args.quote_price_micro as u128);
        require!(
            args.shares as u128 == expected_shares,
            MoxieError::ProofMismatch
        );
        let implied = (args.fill_usdc as u128)
            .checked_mul(1_000_000)
            .ok_or(MoxieError::Overflow)?
            / (args.shares as u128);
        require!(implied <= ceiling as u128, MoxieError::SlippageExceeded);

        escrow.fill_usdc = args.fill_usdc;
        escrow.shares = args.shares;
        escrow.polygon_tx = args.polygon_tx;
        escrow.quote_price_micro = args.quote_price_micro;
        escrow.reference_ask_micro = args.reference_ask_micro;
        escrow.max_slippage_bps = args.max_slippage_bps;
        escrow.polygon_recipient = args.polygon_recipient;
        escrow.phase = Phase::ClobFilled;

        emit!(ClobFilledEvt {
            taker: escrow.taker,
            nonce: escrow.nonce,
            fill_usdc: args.fill_usdc,
            shares: args.shares,
            polygon_tx: args.polygon_tx,
        });
        Ok(())
    }

    /// Pay `fill_usdc` to the solver and return any remainder to the taker.
    /// Permissionless once the fill is recorded: the payee is `escrow.solver`.
    pub fn settle_release(ctx: Context<SettleRelease>) -> Result<()> {
        let (fill, remainder, bump, taker, nonce, solver) = {
            let escrow = &ctx.accounts.escrow;
            require!(escrow.phase == Phase::ClobFilled, MoxieError::InvalidTransition);
            require!(escrow.fill_usdc > 0, MoxieError::InvalidTransition);
            let remainder = escrow
                .size_usdc
                .checked_sub(escrow.fill_usdc)
                .ok_or(MoxieError::Overflow)?;
            (
                escrow.fill_usdc,
                remainder,
                escrow.bump,
                escrow.taker,
                escrow.nonce.to_le_bytes(),
                escrow.solver,
            )
        };

        let seeds: &[&[u8]] = &[b"escrow", taker.as_ref(), nonce.as_ref(), &[bump]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.solver_usdc.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                &[seeds],
            ),
            fill,
        )?;
        if remainder > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.vault.to_account_info(),
                        to: ctx.accounts.taker_usdc.to_account_info(),
                        authority: ctx.accounts.escrow.to_account_info(),
                    },
                    &[seeds],
                ),
                remainder,
            )?;
        }

        let escrow = &mut ctx.accounts.escrow;
        escrow.phase = Phase::Settled;
        emit!(SettlementReleased {
            taker,
            nonce: escrow.nonce,
            solver,
            paid_usdc: fill,
            refunded_usdc: remainder,
        });
        Ok(())
    }

    /// Taker cancel while still locked, or after expiry once a solver is bound.
    /// A recorded fill cannot be refunded; it has to settle.
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let (amount, bump, taker, nonce) = {
            let escrow = &ctx.accounts.escrow;
            require!(
                ctx.accounts.taker.key() == escrow.taker,
                MoxieError::Unauthorized
            );
            let clock = Clock::get()?;
            let allowed = match escrow.phase {
                Phase::EscrowLocked => true,
                Phase::SolverMatched => clock.unix_timestamp >= escrow.expiry_ts,
                _ => false,
            };
            require!(allowed, MoxieError::InvalidTransition);
            (
                escrow.size_usdc,
                escrow.bump,
                escrow.taker,
                escrow.nonce.to_le_bytes(),
            )
        };

        let seeds: &[&[u8]] = &[b"escrow", taker.as_ref(), nonce.as_ref(), &[bump]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.taker_usdc.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                &[seeds],
            ),
            amount,
        )?;

        let escrow = &mut ctx.accounts.escrow;
        escrow.phase = Phase::Refunded;
        emit!(EscrowRefunded {
            taker,
            nonce: escrow.nonce,
            size_usdc: amount,
        });
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Phase {
    EscrowLocked,
    SolverMatched,
    ClobFilled,
    Settled,
    Refunded,
}

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub usdc_mint: Pubkey,
    pub bump: u8,
}

#[account]
pub struct Escrow {
    pub taker: Pubkey,
    pub solver: Pubkey,
    pub phase: Phase,
    pub nonce: u64,
    pub size_usdc: u64,
    pub expiry_ts: i64,
    pub commitment: [u8; 32],
    pub fill_usdc: u64,
    pub shares: u64,
    pub polygon_tx: [u8; 32],
    pub quote_price_micro: u64,
    pub reference_ask_micro: u64,
    pub max_slippage_bps: u16,
    pub polygon_recipient: [u8; 20],
    pub bump: u8,
    pub vault_bump: u8,
}

impl Escrow {
    pub const SIZE: usize = 32
        + 32
        + 1
        + 8
        + 8
        + 8
        + 32
        + 8
        + 8
        + 32
        + 8
        + 8
        + 2
        + 20
        + 1
        + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LockArgs {
    pub nonce: u64,
    pub size_usdc: u64,
    pub expiry_ts: i64,
    pub commitment: [u8; 32],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct FillArgs {
    pub market_id: String,
    pub outcome_token_id: [u8; 32],
    pub max_slippage_bps: u16,
    pub polygon_recipient: [u8; 20],
    pub reference_ask_micro: u64,
    pub quote_price_micro: u64,
    pub fill_usdc: u64,
    pub shares: u64,
    pub polygon_tx: [u8; 32],
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 32 + 1,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(args: LockArgs)]
pub struct LockIntent<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(address = config.usdc_mint @ MoxieError::WrongMint)]
    pub usdc_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = taker,
        space = 8 + Escrow::SIZE,
        seeds = [b"escrow", taker.key().as_ref(), &args.nonce.to_le_bytes()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,
    #[account(
        init,
        payer = taker,
        seeds = [b"vault", escrow.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = escrow
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = taker_usdc.mint == config.usdc_mint @ MoxieError::WrongMint,
        constraint = taker_usdc.owner == taker.key() @ MoxieError::Unauthorized
    )]
    pub taker_usdc: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordSolverMatch<'info> {
    pub solver: Signer<'info>,
    #[account(
        mut,
        seeds = [b"escrow", escrow.taker.as_ref(), &escrow.nonce.to_le_bytes()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, Escrow>,
    /// CHECK: Solana instructions sysvar. Read to bind the previous Ed25519 verify.
    #[account(address = IX_SYSVAR_ID)]
    pub ix_sysvar: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RecordClobFill<'info> {
    pub solver: Signer<'info>,
    #[account(
        mut,
        seeds = [b"escrow", escrow.taker.as_ref(), &escrow.nonce.to_le_bytes()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, Escrow>,
}

#[derive(Accounts)]
pub struct SettleRelease<'info> {
    pub payer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"escrow", escrow.taker.as_ref(), &escrow.nonce.to_le_bytes()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, Escrow>,
    #[account(
        mut,
        seeds = [b"vault", escrow.key().as_ref()],
        bump = escrow.vault_bump
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = solver_usdc.mint == config.usdc_mint @ MoxieError::WrongMint,
        constraint = solver_usdc.owner == escrow.solver @ MoxieError::Unauthorized
    )]
    pub solver_usdc: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = taker_usdc.mint == config.usdc_mint @ MoxieError::WrongMint,
        constraint = taker_usdc.owner == escrow.taker @ MoxieError::Unauthorized
    )]
    pub taker_usdc: Account<'info, TokenAccount>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    pub taker: Signer<'info>,
    #[account(
        mut,
        seeds = [b"escrow", escrow.taker.as_ref(), &escrow.nonce.to_le_bytes()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, Escrow>,
    #[account(
        mut,
        seeds = [b"vault", escrow.key().as_ref()],
        bump = escrow.vault_bump
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = taker_usdc.mint == config.usdc_mint @ MoxieError::WrongMint,
        constraint = taker_usdc.owner == escrow.taker @ MoxieError::Unauthorized
    )]
    pub taker_usdc: Account<'info, TokenAccount>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    pub token_program: Program<'info, Token>,
}

#[event]
pub struct IntentLocked {
    pub taker: Pubkey,
    pub nonce: u64,
    pub size_usdc: u64,
    pub expiry_ts: i64,
    pub commitment: [u8; 32],
}

#[event]
pub struct SolverMatchedEvt {
    pub taker: Pubkey,
    pub nonce: u64,
    pub solver: Pubkey,
    pub commitment: [u8; 32],
}

#[event]
pub struct ClobFilledEvt {
    pub taker: Pubkey,
    pub nonce: u64,
    pub fill_usdc: u64,
    pub shares: u64,
    pub polygon_tx: [u8; 32],
}

#[event]
pub struct SettlementReleased {
    pub taker: Pubkey,
    pub nonce: u64,
    pub solver: Pubkey,
    pub paid_usdc: u64,
    pub refunded_usdc: u64,
}

#[event]
pub struct EscrowRefunded {
    pub taker: Pubkey,
    pub nonce: u64,
    pub size_usdc: u64,
}

#[error_code]
pub enum MoxieError {
    #[msg("Intent expiry is not in the future")]
    Expired,
    #[msg("Nonce already consumed by an existing escrow")]
    Replay,
    #[msg("Order phase does not allow this transition")]
    InvalidTransition,
    #[msg("Quote or fill exceeds maximum slippage")]
    SlippageExceeded,
    #[msg("Insufficient USDC")]
    InsufficientBalance,
    #[msg("Fulfillment proof does not bind this commitment")]
    ProofMismatch,
    #[msg("Solver authorization signature is missing or invalid")]
    BadSignature,
    #[msg("Intent is missing a required field")]
    IntentIncomplete,
    #[msg("Size must be greater than zero")]
    ZeroSize,
    #[msg("Signer is not allowed to move this escrow")]
    Unauthorized,
    #[msg("Token mint is not the configured USDC mint")]
    WrongMint,
    #[msg("Arithmetic overflow")]
    Overflow,
}

fn intent_commitment(
    taker: &[u8],
    nonce: u64,
    size_usdc: u64,
    expiry_ts: i64,
    args: &FillArgs,
) -> Result<[u8; 32]> {
    let market = args.market_id.as_bytes();
    let mut data = Vec::with_capacity(16 + 32 + 8 + 8 + 8 + 4 + market.len() + 32 + 2 + 20 + 8);
    data.extend_from_slice(INTENT_DOMAIN);
    data.extend_from_slice(taker);
    data.extend_from_slice(&nonce.to_le_bytes());
    data.extend_from_slice(&size_usdc.to_le_bytes());
    data.extend_from_slice(&expiry_ts.to_le_bytes());
    data.extend_from_slice(&(market.len() as u32).to_le_bytes());
    data.extend_from_slice(market);
    data.extend_from_slice(&args.outcome_token_id);
    data.extend_from_slice(&args.max_slippage_bps.to_le_bytes());
    data.extend_from_slice(&args.polygon_recipient);
    data.extend_from_slice(&args.reference_ask_micro.to_le_bytes());
    Ok(hash(&data).to_bytes())
}

fn max_price(reference: u64, bps: u16) -> Result<u64> {
    let scaled = (reference as u128)
        .checked_mul(10_000u128 + bps as u128)
        .ok_or(MoxieError::Overflow)?;
    u64::try_from(scaled / 10_000).map_err(|_| error!(MoxieError::Overflow))
}

fn read_u16(data: &[u8], at: usize) -> Result<u16> {
    let bytes = data
        .get(at..at + 2)
        .ok_or(MoxieError::BadSignature)?;
    Ok(u16::from_le_bytes([bytes[0], bytes[1]]))
}

/// The instruction immediately before this one must be an Ed25519-program
/// verify whose message, pubkey, and signature live inside that instruction
/// (`u16::MAX` offsets) and match the taker authorization we expect.
fn verify_prior_ed25519(
    ix_sysvar: &AccountInfo,
    taker: &[u8],
    message: &[u8],
    signature: &[u8; 64],
) -> Result<()> {
    let current = load_current_index_checked(ix_sysvar)?;
    require!(current > 0, MoxieError::BadSignature);
    let ix = load_instruction_at_checked(current.saturating_sub(1) as usize, ix_sysvar)?;
    require!(ix.program_id == ed25519_program::ID, MoxieError::BadSignature);
    let data = &ix.data;
    require!(data.first() == Some(&1u8), MoxieError::BadSignature);
    let sig_off = read_u16(data, 2)? as usize;
    let sig_ix = read_u16(data, 4)?;
    let pk_off = read_u16(data, 6)? as usize;
    let pk_ix = read_u16(data, 8)?;
    let msg_off = read_u16(data, 10)? as usize;
    let msg_len = read_u16(data, 12)? as usize;
    let msg_ix = read_u16(data, 14)?;
    require!(
        sig_ix == u16::MAX && pk_ix == u16::MAX && msg_ix == u16::MAX,
        MoxieError::BadSignature
    );
    let sig_bytes = data
        .get(sig_off..sig_off + 64)
        .ok_or(MoxieError::BadSignature)?;
    let pk_bytes = data
        .get(pk_off..pk_off + 32)
        .ok_or(MoxieError::BadSignature)?;
    let msg_bytes = data
        .get(msg_off..msg_off + msg_len)
        .ok_or(MoxieError::BadSignature)?;
    require!(sig_bytes == signature.as_slice(), MoxieError::BadSignature);
    require!(pk_bytes == taker, MoxieError::BadSignature);
    require!(msg_bytes == message, MoxieError::BadSignature);
    Ok(())
}
