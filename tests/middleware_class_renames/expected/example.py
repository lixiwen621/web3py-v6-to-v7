from web3.middleware import ENSNameToAddressMiddleware
from web3.middleware import ExtraDataToPOAMiddleware
from web3.middleware import PythonicMiddleware
from web3.middleware import AttributeDictMiddleware

w3.middleware_onion.add(ENSNameToAddressMiddleware)
w3.middleware_onion.add(ExtraDataToPOAMiddleware)
w3.middleware_onion.add(PythonicMiddleware)
w3.middleware_onion.add(AttributeDictMiddleware)
