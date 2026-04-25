from web3 import AsyncWeb3
from web3.providers.websocket import WebsocketProviderV2

async_w3 = AsyncWeb3.persistent_websocket(WebsocketProviderV2("ws://localhost:8546"))

async for message in w3.ws.process_subscriptions():
    print(message)
