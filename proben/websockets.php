<?php
include "config.php";
$address = 'localhost';
$port = 5000;

// Create WebSocket.
$server = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
socket_set_option($server, SOL_SOCKET, SO_REUSEADDR, 1);
socket_bind($server, $address, $port);
socket_listen($server);
$client = socket_accept($server);

// Send WebSocket handshake headers.
$request = socket_read($client, 5000);
preg_match('#Sec-WebSocket-Key: (.*)\r\n#', $request, $matches);
$key = base64_encode(pack(
    'H*',
    sha1($matches[1] . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
));
$headers = "HTTP/1.1 101 Switching Protocols\r\n";
$headers .= "Upgrade: websocket\r\n";
$headers .= "Connection: Upgrade\r\n";
$headers .= "Sec-WebSocket-Version: 13\r\n";
$headers .= "Sec-WebSocket-Accept: $key\r\n\r\n";
socket_write($client, $headers, strlen($headers));

// Send messages into WebSocket in a loop.
while (true) {
    sleep(2);
    $content = '<div class="container"><div class="d-flex flex-column justify-content-center"><div class = "d-flex flex-wrap justify-content-center"><div class = "d-flex flex-row justify-content-center"><div  class="card m-2" style="width: 30vw; max-width: 120px"><img id="ableg1"  class="card-img-top img-fluid" src="karten/deckblatt.jpg" alt="Karte 1"><div class="card-body"><h5 class="card-title">a</h5><p></p></div></div><div  class="card m-2" style="width: 30vw; max-width: 120px"><img  id="ableg2"  class="card-img-top img-fluid" src="karten/deckblatt.jpg" alt="Karte 2"><div class="card-body"><h5 class="card-title">b</h5><p></p></div></div><div  class="card m-2" style="width: 30vw; max-width: 120px"><img id="ableg3" class="card-img-top img-fluid" src="karten/deckblatt.jpg" alt="Karte 3"><div class="card-body"><h5 class="card-title">c</h5><p></p></div></div></div><p><button class="btn btn-primary" type="button" data-bs-toggle="collapse" data-bs-target="#collapseExample"aria-expanded="false" aria-controls="collapseExample">Punktetabelle</button></p><div class="collapse" id="collapseExample"><div class="card card-body">     </div></div></div></div></div>';
    for ($i = 0; $i < strlen($content); $i++) {
        $response = chr(129) . chr(strlen($content)) . $content[$i];
        socket_write($client, $response);
    }
}
function kartenausteilen($s, $n1, $n2, $n3)
{
    $data = sql("select jetztdran, spielrunde from spiele where id = 273");
    while ($row = pg_fetch_row($data)) {
        $jetztdran = $row[0];
        $spielrunde = $row[1];
    }

// $data_karten = sql("select ablegkarten[1], ablegkarten[2], ablegkarten[3] from spiele where id = 273");
// try {
//     while ($row = pg_fetch_row($data_karten)) {
//         $a_karte1 = $row[0];
//         $a_karte2 = $row[1];
//         $a_karte3 = $row[2];
//     }
// }
// catch (\Throwable $th) {
//     new error($th);
// }
// }
/* <tbody>';
 $data = sql("select anzahl from spiele where id = 273;");
 while ($row = pg_fetch_row($data)) {
 $anzahl = $row[0];
 }
 for ($i = 1; $i < $anzahl + 1; $i++) { $htmlstring=$htmlstring . '<tr>
 <th scope="row">' . $i . '</th>
 </tr>' ; } $d=sql("select spielart from spiele where id=273"); while ($row=pg_fetch_row($d)) {
 $spielart=$row[0]; } $htmlstring=$htmlstring . '
 <tr><th>Spielart</th><th>' . $spielart . '</th></tr>
 </tbody> */
}
?>