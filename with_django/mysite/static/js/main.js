var mapPeers = {}
const usernameInput = document.querySelector('#username')
const btnJoin = document.querySelector('#btn-join')

var webSocket;

function webSocketOnMessage(e) {
    const parsedData = JSON.parse(e.data)
    const peerUsername = parsedData['peer'];
    const action = parsedData['action'];

    if (username == peerUsername) return

    var rec_channel_name = parsedData['message']['content']

    if (action == 'new-peer') {
        createOffer(peerUsername, rec_channel_name);
        return
    }

    if (action == 'new-offer') {
        var offer = parsedData['message']['content']
        createAnswer(offer, peerUsername, rec_channel_name);
    }

    if (action == 'new-answer') {
        var ans = parsedData['message']['content'];
        var peer = mapPeers[peerUsername][0];
        peer.setRemoteDescription(ans);
        return;
    }
}

btnJoin.addEventListener('click', () => {
    username = usernameInput.value;

    if (username === '') return;

    usernameInput.value = '';
    usernameInput.disabled = true;
    usernameInput.style.visibility = 'hidden';

    btnJoin.disabled = true;
    btnJoin.style.visibility = 'hidden';

    const labelUsername = document.querySelector('#label-username');
    labelUsername.innerHTML = username;

    const loc = window.location;

    var wsStart = 'ws://';
    if (loc.protocol == 'https:') {
        wsStart = 'wss://';
    }

    const endPoint = wsStart + loc.host + loc.pathname;

    webSocket = new WebSocket(endPoint);

    webSocket.addEventListener('open', (e) => {
        const jsonStr = JSON.stringify({
            'peer': username,
            'action': 'new-peer',
            'message': {}
        });

        webSocket.send(jsonStr);

        sendSignal('new-peer', {});
    });

    webSocket.addEventListener('message', webSocketOnMessage);
    webSocket.addEventListener('close', (e) => {});
    webSocket.addEventListener('error', (e) => {});
});

function createAnswer(offer, peerUsername, rec_channel_name) {
    var peer = new RTCPeerConnection(null);
    addLocalTrack(peer);

    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);

    peer.addEventListener('datachannel', e => {
        peer.dc = e.channel;
        peer.dc.addEventListener('open', () => {});
        peer.dc.addEventListener('message', dcOnMsg)
        mapPeers[peerUsername] = [peer, peer.dc];
    });

    peer.addEventListener('iceconnectionstatechange', () => {
        var iceconnectionstate = peer.iceconnectionstate;
        if (iceconnectionstate === 'failed' || iceconnectionstate === 'disconnected' || iceconnectionstate === 'closed') {
            delete mapPeers[peerUsername];

            if (iceconnectionstate != 'closed') {
                peer.close();
            }

            removeVideo(remoteVideo);
        }
    });

    peer.addEventListener('icecandidate', (e) => {
        if (e.candidate) {
            return
        }

        sendSignal('new-offer', {
            'sdp': peer.localDescription,
            'rec_channel_name': rec_channel_name
        })
    })

    peer.remoteDescription(offer)
        .then(() => {
            peer.createAnswer()
        })
        .then(a => {
            peer.setLocalDescription(a)
        })
}

var localStream = new MediaStream();

const constraints = {
    'video': true,
    'audio': true
}
const localVideo = document.querySelector('#local-video')
const btnToggleAudio = document.querySelector('#btn-toggle-audio')
const btnToggleVideo = document.querySelector('#btn-toggle-video')
var userMedia = navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        localStream = stream
        localVideo.srcObject = localStream;
        localVideo.muted = true

        var audioTrack = stream.getAudioTracks()
        var videoTrack = stream.getVideoTracks()

        audioTrack[0].enabled = true;
        videoTrack[0].enabled = true;

        btnToggleAudio.addEventListener('click', () => {
            audioTrack[0].enabled = !audioTrack[0].enabled
            audioTrack[0].enabled ? btnToggleAudio.innerHTML = 'Audio Mute' : btnToggleAudio.innerHTML = 'Audio UnMute'
        })
        btnToggleVideo.addEventListener('click', () => {
            videoTrack[0].enabled = !videoTrack[0].enabled
            videoTrack[0].enabled ? btnToggleVideo.innerHTML = 'Off Video' : btnToggleVideo.innerHTML = 'On Video'
        })
    })
    .catch(error => {});

function sendSignal(action, message) {
    const jsonStr = JSON.stringify({
        'peer': username,
        'action': action,
        'message': message
    });

    webSocket.send(jsonStr);
}

function createOffer(peerUsername, rec_channel_name) {
    var peer = new RTCPeerConnection(null);
    addLocalTrack(peer);

    var dc = peer.createDataChannel('channel')
    dc.addEventListener('open', () => {});
    dc.addEventListener('message', dcOnMsg)
    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);
    mapPeers[peerUsername] = [peer, dc];

    peer.addEventListener('iceconnectionstatechange', () => {
        var iceconnectionstate = peer.iceconnectionstate;
        if (iceconnectionstate === 'failed' || iceconnectionstate === 'disconnected' || iceconnectionstate === 'closed') {
            delete mapPeers[peerUsername];

            if (iceconnectionstate != 'closed') {
                peer.close();
            }

            removeVideo(remoteVideo);
        }
    });

    peer.addEventListener('icecandidate', (e) => {
        if (e.candidate) {
            return
        }

        sendSignal('new-offer', {
            'sdp': peer.localDescription,
            'rec_channel_name': rec_channel_name
        })
    })

    peer.createOffer()
        .then(o => peer.setLocalDescription(o))
        .then(() => {});
}

function addLocalTrack(peer) {
    localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream)
    })
}

var msgList = document.querySelector('#message-list');

function dcOnMsg(e) {
    var message = e.data
    var li = document.createElement('li')
    li.appendChild(document.createTextNode(message));
    msgList.appendChild(li)
}

function createVideo(peerUsername) {
    var videoContainer = document.querySelector('#video-container')
    var remoteVideo = document.createElement('video')
    remoteVideo.id = peerUsername + '-video'
    remoteVideo.autoplay = true
    remoteVideo.playsInline = true

    var videoWrapper = document.createElement('div')
    videoContainer.appendChild(videoWrapper);
    videoWrapper.appendChild(remoteVideo);

}

function setOnTrack(peer, remoteVideo) {
    var remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream
    peer.addEventListener('track', async (e) => {
        remoteStream.addTrack(e.track, remoteStream)
    })
}

function removeVideo(video) {
    var videoWrapper = video.parentNode;
    videoWrapper.parentNode.removeChild(videoWrapper)
}



var btnSendMsg = document.querySelector('#btn-send-msg')
var messageList = document.querySelector('#message-list')
var messageInput = document.querySelector('#msg')
btnSendMsg.addEventListener('click',()=>{
    var message = messageInput.value;
    var li = document.createElement('li')
    li.appendChild(document.createTextNode('Me: ' + message))
    messageList.appendChild(li)
    var datachannel = []

    for (peerUsername in mapPeers) {
        datachannel.push(mapPeers[peerUsername][1])
    }

    message = username + ':' + message;
    for (index in datachannel) {
        datachannel[index].send(message)
    }

    message.value = '';
})