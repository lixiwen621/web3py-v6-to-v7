from web3.types import StateOverride

params: StateOverride = {}
result = w3.eth.call(tx, state_override=StateOverride({}))
