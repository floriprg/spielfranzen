const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.sendFile('game.html');
});
http.listen(port, () => {
    console.log(`Socket.IO server running at http://localhost:${port}/`);
});
io.on('connection', (socket) => {
    const { Client } = require('pg');
    const client = new Client({
        connectionString: "postgres://ziekgdhkxuqkta:c7029fdf0002ed1705c9fbf741c8a9dcf6fc3d4ca04f4c1957d7d7b3a1277543@ec2-34-242-84-130.eu-west-1.compute.amazonaws.com:5432/d2stjk7j24ibr", //process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    client.connect();
    client.query('select id, s1, s2, s3, erlaubte, anzahl, spielpasswort, name from spiele where fertig = false;', (err, res) => {
        if (err) throw err;
        for (let row of res.rows) {
            let s1 = row[0];
            let s2 = row[1];
            let s3 = row[2];
            socket.emit('spieleAnzeigen', s1); //nur zu der einen person schicken!!!
        }
        client.end();
    });
    socket.on('newgame', (newgamedata) => {
        client.connect();
        client.query("insert into spiele(spielrunde, ablegkarten, gestartet, name, fertig, erlaubte, s1, s2, s3, kartenausgeteilt,anzahl, jetztdran, spielart, gehebt)values(0, ARRAY['keine', 'keine', 'keine'], false, '" + newgamedata[0] + "', false,'" + newgamedata[1] + "', '{\"name\":\"offen\"}', '{\"name\":\"offen\"}', '{\"name\":\"offen\"}', false, '" + newgamedata[2] + "', 's3', 4, true);"), (err, res) => {
        }
    })
});
