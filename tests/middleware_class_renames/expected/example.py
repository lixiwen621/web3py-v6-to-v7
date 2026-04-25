from web3.middleware import PythonicMiddleware
from web3.middleware import AttrDictMiddleware

w3.middleware_onion.add(PythonicMiddleware)
w3.middleware_onion.add(AttrDictMiddleware)
