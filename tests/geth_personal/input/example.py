if use_local:
    w3.geth.personal.unlock_account(account, pwd)

w3.geth.personal.list_accounts()
