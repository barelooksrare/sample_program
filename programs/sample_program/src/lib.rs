use anchor_lang::prelude::*;

declare_id!("2j3BgHSJgXpvPne1JUkLaZ7W5Q1LmcF4RomqMg121mvf");

#[program]
pub mod sample_program {
    use anchor_lang::{
        system_program::{self, Transfer},
    };

    use super::*;

    pub fn initialize(ctx: Context<Initialize>, number: u16) -> Result<()> {
        ctx.accounts.value_account.number = number;
        msg!("set value in Number account to {}", number);
        Ok(())
    }

    pub fn check_value(ctx: Context<CheckValue>) -> Result<()> {
        let account_data =
            ctx.accounts.numbers_account.to_account_info().data.borrow()[8..].to_vec();
        let last_number = account_data[1];
        msg!("last number in expected Numbers account is {}", last_number);
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let accounts = Transfer {
            from: ctx.accounts.signer.to_account_info(),
            to: ctx.accounts.escrow.to_account_info(),
        };
        let context =
            CpiContext::<Transfer>::new(ctx.accounts.system_program.to_account_info(), accounts);
        system_program::transfer(context, amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let accounts = Transfer {
            from: ctx.accounts.escrow.to_account_info(),
            to: ctx.accounts.signer.to_account_info(),
        };
    
        system_program::transfer(
            CpiContext::<Transfer>::new_with_signer(
                ctx.accounts.system_program.to_account_info(), 
                accounts, 
                &[&[b"escrow", ctx.accounts.signer.key().as_ref(), &[*ctx.bumps.get("escrow").unwrap()]]]), amount)
    }
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    ///CHECK: we aren't reading anything from this account
    #[account(mut, seeds=[b"escrow",signer.key().as_ref()], bump)]
    pub escrow: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    ///CHECK: we aren't reading anything from this account
    #[account(mut, seeds=[b"escrow",signer.key().as_ref()], bump)]
    pub escrow: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(init, space=8+4+4, payer=signer)]
    pub value_account: Account<'info, Value>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CheckValue<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    /// CHECK: this account is not checked
    #[account()]
    pub numbers_account: UncheckedAccount<'info>,
}

#[account]
pub struct Numbers {
    //0 - 255
    pub number: u8,
    //0 - 255
    pub number2: u8,
}

#[account]
pub struct Value {
    //0 - 65535
    pub number: u16,
}
