from web3 import AsyncWeb3
from web3.providers.websocket import WebSocketProvider

async_w3 = AsyncWeb3(WebSocketProvider("ws://localhost:8546"))

async for message in w3.socket.process_subscriptions():
    print(message)
