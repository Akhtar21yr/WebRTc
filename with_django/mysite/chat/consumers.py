from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.exceptions import StopConsumer


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.accept()
        self.group_name = 'test_room'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        
        
    
    async def disconnect(self,code):
         StopConsumer()
         print('disconnected')
         
         
    
    async def receive_json(self,content):
        message = content['message']
        action = content['action']
        
        if (action == 'new-offer') or (action == 'new-answer'):
            rec_channel_name  = content['message']['rec_channel_name']
            content['message']['rec_channel_name'] = self.channel_name
            await self.channel_layer.send(
                rec_channel_name, {"type": "send.sdp",'content':content}
            )
            return
        
        content['message']['rec_channel_name'] = self.channel_name
        
        await self.channel_layer.group_send(
                self.group_name, {"type": "send.sdp",'content':content}
            )
        
    async def send_sdp(self,event):
        content = event.get('content')
        self.send_json({"content": content})
        
        
    