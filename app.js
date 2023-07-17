const CreateSocket = require("@adiwajshing/baileys").default
const {
	MessageType, 
    MessageOptions, 
    Mimetype,
	DisconnectReason,
    downloadMediaMessage,
    useMultiFileAuthState
} =require("@adiwajshing/baileys"); 

const { Boom } =require("@hapi/boom");
const path = require('path');
const express = require("express");
const P = require("pino")
const app = express();
const port = 3000;
const server = require("http").createServer(app);
const { phoneNumberFormatter } = require('./helpers/formatter');


app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

async function WhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(
        __dirname+"./auth" // path folder for save credentials
    )

    const socket = CreateSocket({
        logger: P({ level: "silent" }),
        generateHighQualityLinkPreview: true,
        auth: state,
        printQRInTerminal: true,
        browser: ["Custom", "MacOS", "3.0"],
        connectTimeoutMs: undefined,
        defaultQueryTimeoutMs: undefined,
        version: [2,2324,5]
    })
  
    socket.ev.on("creds.update", saveCreds)
    socket.ev.on("connection.update", (status) => {
        if(status.qr != undefined){
            console.log(status.qr)
        }
        const { connection, lastDisconnect } = status
        if(connection == "close") {
            console.log('Koneksi Close, Mulai ulang');
            const tryConnect = (lastDisconnect.error = Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            if(tryConnect) {
                WhatsApp()
            }
        }
        if(connection == 'connecting'){
            console.log('Menuggu koneksi')
        }
        if(connection == "open") {
            console.log("✅ Success Whatsapp Terkoneksi!");
            profile()
        }
    });

//funsi logging
socket.ev.on("messages.upsert", async ({messages, type}) => {
  console.log(messages);
});

//info gempa
app.post('/send-image', async (req, res) => {
    console.log("run send-image");
    const img = req.body.img;
    const pesan = req.body.pesan;
    const number = phoneNumberFormatter(req.body.number);
    await socket.sendMessage(number, { image: {url: img}, caption: pesan })
    .then(response => {
    res.status(200).json({
        status: true,
        });
    }).catch(err => {
        res.status(500).json({
        status: false,
        });
    });
    
});

//send document of file
app.post('/send-file', async (req, res) => {
    const pesan = req.body.pesan;
    let file_name = req.body.file_name;
    let file_url = req.body.file_url;
    let phone = req.body.number;
    console.log(phone)
    if(phone.endsWith("@g.us")){
        var number = req.body.number;
        var grup = true;
    }else{
        var number = phoneNumberFormatter(phone);
        var grup = false;
    }
        const [result] = await socket.onWhatsApp(number);
    try{
        if (result.exists.toString() == 'true' || grup == true){
        await socket.sendMessage(number, { document: { url: file_url }, fileName: file_name || path.basename(parsed.pathname), caption: pesan })
            .then(response => {
            res.status(200).json({
                status: true,
                response: response
                });
            });
            console.log(`terkirim pesan: ${pesan}`);
        }
    }catch (error){
        return res.status(422).json({
            status: false,
            message: 'The number is not registered'
          });
    }
});

//send message text only
app.post('/send-message', async (req, res) => {
    const pesan = req.body.pesan;
    let number = phoneNumberFormatter(req.body.number);
    const [result] = await socket.onWhatsApp(number);
    try{
        let cek = await result.exists.toString()
    }catch{
        if(req.body.number.endsWith('@g.us')){
            var isGrup = true;
            number = req.body.number;
        }
    }
    if (isGrup == true || result.exists.toString() == 'true'){
    await socket.sendMessage(number, { text: pesan })
    .then(response => {
        res.status(200).json({
            status: true,
            response: response
            });
        }).catch(err => {
            res.status(500).json({
            status: false,
            response: err
            });
        });
        console.log("Send message..!");
    }else{
        return res.status(422).json({
            status: false,
            message: 'The number is not registered'
          });
    }
});

// send text video
app.post('/send-video', async (req, res) => {
    const pesan = req.body.pesan;
    const video = req.body.video;
    const number = phoneNumberFormatter(req.body.number);
    const [result] = await socket.onWhatsApp(number);
    if (result.exists.toString() === 'true'){
    await socket.sendMessage(number, { video: { url: video }, caption: pesan })
    .then(response => {
    res.status(200).json({
        status: true,
        response: response
        });
    }).catch(err => {
        res.status(500).json({
        status: false,
        response: err
        });
    });
    console.log("registered");
    }else{
        return res.status(422).json({
            status: false,
            message: 'The number is not registered'
          });
    }
});


// send text group
app.post('/send-group', async (req, res) => {
    const img = req.body.image;
    const pesan = req.body.pesan;
    const number = req.body.number;
    await socket.sendMessage(number, {image: {url: img}, caption: pesan})
    .then(response => {
    res.status(200).json({
        status: true,
        response: response
        });
    }).catch(err => {
        res.status(500).json({
        status: false,
        response: err
        });
    });
    console.log("registered")
});

}
// run in main file
WhatsApp()

server.listen(port, () => {
  console.log("Server Berjalan pada Port : " + port);
});

