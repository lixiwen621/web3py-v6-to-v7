from web3.types import CallOverride

params: CallOverride = {}
result = w3.eth.call(tx, state_override=CallOverride({}))
