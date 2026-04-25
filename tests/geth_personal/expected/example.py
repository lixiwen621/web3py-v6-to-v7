# TODO(v7): geth.personal removed; manual migration required
if use_local:
    w3.geth.personal.unlock_account(account, pwd)

# REMOVED in v7: geth.personal namespace removed
