const _ = require('lodash');
const BaseModule = require('./baseModule');

class AsomeBot extends BaseModule {
    constructor() {
        super();

        this.isDraing = false;
        this.sendBuffer = [];

        this.receivedText = "";

        this.msg_id = '';
        this.sendToEntry = {
            msg_id: "",
            distance: 0,
            udp_msg: "",
        };
    }

    connect() {
    }

    socketReconnection() {
        this.socket.send(this.handler.encode());
    }

    requestInitialData() {
        console.log("requestInitialData");

        var init_str = "import asomebot_align; import asomebot; import hcsr04; asomebot.ready(5, 6, 7,8); hcsr04.open(3, 2)\r";
        return Buffer.from(init_str, "ascii");
    }

    setSerialPort(sp) {
        this.sp = sp;
    }

    setSocket(socket) {
        this.socket = socket;
    }

    checkInitialData(data, config) {
        return true;
    }

    validateLocalData(data) {
        return true;
    }

    requestRemoteData(handler) {
        var sendToEntry = this.sendToEntry;
        // console.log("to Entry: ", sendToEntry);

        for (var key in sendToEntry) {
            handler.write(key, sendToEntry[key]);
        }
        return;
    }

    handleRemoteData({ receiveHandler = {} }) {
        const { data: handlerData } = receiveHandler;
        if (_.isEmpty(handlerData)) {
            return;
        }

        if (handlerData.msg_id == undefined) {
            console.log("from handlerData.msg_id == undefined", handlerData);
            return;
        }

        if (handlerData.msg_id != this.msg_id) {
            console.log("from Entry: ", handlerData);

            this.msg_id = handlerData.msg_id;
            this.sendBuffer.push(Buffer.from(handlerData.msg + "\r", 'ascii'));
            this.sendBuffer.push(Buffer.from("'#ID " + handlerData.msg_id + "'\r", 'ascii'));
        }
    }

    requestLocalData() {
        var self = this;

        if (!this.isDraing && this.sendBuffer.length > 0) {
            this.isDraing = true;
            var msg = this.sendBuffer.shift();
            console.log("to AsomeBot: ", msg.toString(), this.sendBuffer.length);
            this.sp.write(msg, function() {
                if (self.sp) {
                    self.sp.drain(function() {
                        self.isDraing = false;
                    });
                }
            });
        }
    
        return null;
    }

    handleLocalData(data) {
        // console.log("handleLocalData: ", this.receivedText);

        this.receivedText = this.receivedText + data.toString();

        var index = this.receivedText.indexOf('\r');
        while (index >= 0) {
            var line = this.receivedText.substring(0, index);
            this.receivedText = this.receivedText.substring(index + 1);

            console.log("from AsomeBot: ", line);

            if (line.indexOf('#DT') >= 0) {
                var values = line.split(" ");
                if (values.length > 1) this.sendToEntry.distance = values[1];
                console.log("distance: ", values);
            }
            if (line.indexOf('#UDP') >= 0) {
                var values = line.split(" ");
                if (values.length > 1) this.sendToEntry.udp_msg = values[1];
            }
            if (line.indexOf('#ID') >= 0) this.sendToEntry.msg_id = line;

            index = this.receivedText.indexOf('\r');
        }
    }

    setSocketData({ socketData, data }) {
    }

    lostController() { }

    disconnect(connect) {
        connect.close();
        this.sp = null;
    }

    reset() {
        this.sp = null;
        this.isPlaying.set(0);
        this.sendBuffer = [];
        this.receivedText = "";
    }
}

module.exports = new AsomeBot();
