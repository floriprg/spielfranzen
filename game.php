<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mein Spiel</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet"
        integrity="sha384-gH2yIJqKdNHPEq0n4Mqa/HGKIhSkIHeL5AyhkYV8i59U5AR6csBvApHHNl/vI1Bx" crossorigin="anonymous">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>

</head>

<body>
    <h1 class="text-center">
        <?php
require "config.php";
if (isset($_GET['s']) && !($_GET['s'] == "" && !($_GET['s'] == "null"))) {
  $data = sql("select name from spiele where id = " . $_GET['s'] . "");
  while ($row = pg_fetch_row($data)) {
    echo "$row[0]";
  }
}

?>
    </h1>
    <ul class="nav nav-tabs justify-content-center">
        <li class="nav-item">
            <a class="nav-link active" href="home.php">
                Home
            </a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="index.php">Spielen</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="login.php">Anmelden</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="register.php">Registrieren</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="rangliste.php">Rangliste</a>
        </li>
        <li class="nav-item">
            <a class="nav-link active" href="game.php">Mein Spiel</a>
        </li>
    </ul>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-A3rJD856KowSb7dwlZdYEkO39Gagi7vIsF0jrRAoQmDKKtQBHUuLZ9AsSv4jD4Xa" crossorigin="anonymous">
    </script>
    <script src="game.js"></script>
</body>

</html>
<?php
include 'vendor/autoload.php';
//require "config.php";
begin();
function neuekarten()
{
  $karten = array("1 laub.jpg", "1 sche.jpg", "1 eich.jpg", "1 herz.jpg", "2 laub.jpg", "2 sche.jpg", "2 eich.jpg", "2 herz.jpg", "3 laub.jpg", "3 sche.jpg", "3 eich.jpg", "3 herz.jpg", "4 laub.jpg", "4 sche.jpg", "4 eich.jpg", "4 herz.jpg", "5 eich.jpg", "5 herz.jpg", "5 laub.jpg", "5 sche.jpg", "7 eich.jpg", "7 herz.jpg", "7 laub.jpg", "7 sche.jpg", "8 eich.jpg", "8 herz.jpg", "8 laub.jpg", "8 sche.jpg", "9 eich.jpg", "9 herz.jpg", "9 laub.jpg", "9 sche.jpg", "weli.jpg");
  $zufallskarten = [];
  for ($i = 0; $i < 33; $i++) {
    $zahl = rand(0, (count($karten) - 1));
    $zufallskarten[] = $karten[$zahl];
    array_splice($karten, $zahl, 1);
  }
  return $zufallskarten;
}
function begin()
{
  $data1 = sql("select s1, s2, s3 from spiele where id = " . $_GET['s'] . ";");
  while ($row = pg_fetch_row($data1)) {
    $data = gettokendata();
    $name = $data->name;
    $s1 = json_decode($row[0], false);
    $s2 = json_decode($row[1], false);
    $s3 = json_decode($row[2], false);
  }
  if ($s1->name == "offen") {
    $s1->punkte = 0;
    $s2->punkte = 0;
    $s3->punkte = 0;
    $data = sql("select kartenausgeteilt from spiele where id =" . $_GET['s'] . ";");
    while ($row = pg_fetch_row($data)) {
      if ($row[0] == "f") {
        sql("update spiele set kartenausgeteilt = true where id = " . $_GET['s'] . ";");
        $zufallskarten = neuekarten();
        $s1->karten = array_splice($zufallskarten, 0, 10);
        $s2->karten = array_splice($zufallskarten, 0, 10);
        $s3->karten = array_splice($zufallskarten, 0, 10);
        $talon = $zufallskarten;
      }
    }
  }
  if ($s1->name == "offen" || $s1->name == $name) {
    if ($s1->name != $name) {
      $s1->name = $name;
      sql("update spiele set s1 = '" . json_encode($s1) . "' where id = " . $_GET['s'] . ";");
      sql("update spiele set s2 = '" . json_encode($s2) . "' where id = " . $_GET['s'] . ";");
      sql("update spiele set s3 = '" . json_encode($s3) . "' where id = " . $_GET['s'] . ";");
      sql("update spiele set talon =  '{" . $talon[0] . ", " . $talon[1] . ", " . $talon[2] . "}' where id = " . $_GET['s'] . ";");
    }
    kartenausteilen($s1);
  }
  else if ($s2->name == "offen" || $s2->name == $name) {
    if ($s2->name != $name) {
      $s2->name = $name;
      sql("update spiele set s2 = '" . json_encode($s2) . "' where id = " . $_GET['s'] . ";");
    }
    kartenausteilen($s2);
  }
  else if ($s3->name == "offen" || $s2->name == $name) {
    if ($s3->name != $name) {
      $s3->name = $name;
      sql("update spiele set s3 = '" . json_encode($s3) . "' where id = " . $_GET['s'] . ";");
    }
    kartenausteilen($s3);
  }
  else {
    echo '<div class="alert alert-warning" role="alert">
 Dieses Spiel ist leider schon besetzt
 </div>';
  }
}
function kartenausteilen($s)
{
  echo '<div class="container">';
  echo '
  <div class="d-flex flex-wrap justify-content-center">
    <div class="card m-2" style="width: 6rem;">
      <img class="card-img-top img-fluid" src="karten/deckblatt.jpg" alt="Card image cap">
      <div class="card-body">
        <h5 class="card-title">Name des Spielers</h5>
      </div>
    </div>
    <div class="card m-2" style="width: 6rem;">
      <img class="card-img-top img-fluid" src="karten/deckblatt.jpg" alt="Card image cap">
      <div class="card-body">
        <h5 class="card-title">Name des Spielers</h5>
      </div>
    </div>
    <div class="card m-2" style="width: 6rem;">
      <img class="card-img-top img-fluid" src="karten/deckblatt.jpg" alt="Card image cap">
      <div class="card-body">
        <h5 class="card-title">Name des Spielers</h5>
      </div>
    </div>

  <p>
  <button class="btn btn-primary" type="button" data-bs-toggle="collapse" data-bs-target="#collapseExample"
    aria-expanded="false" aria-controls="collapseExample">
    Punktetabelle
  </button>
  </p>
  <div class="collapse" id="collapseExample">
  <div class="card card-body">     
  <table class="table w-25">
  <thead>
  <tr>
    <th scope="col">Punkte</th>
    <th scope="col">Spieler 1</th>
    <th scope="col">Spieler 2</th>
    <th scope="col">Spieler 3</th>
  </tr>
  </thead>
  <tbody>';
  for ($i = 0; $i < 10; $i++) {
    echo '<tr>
            <th scope="row">1</th>
          </tr>';
  }
  echo '
  </tbody>
  </table>
  </div>
  </div>
  <div class="d-flex flex-row">';
  for ($i = 0; $i < 10; $i++) {
    echo '<div class="card m-0.5" style="width: 9vw;">
    <img class="card-img-top img-fluid" src="karten/' . $s->karten[$i] . '" alt="Card image cap"> 
    </div>';
  }
  echo '
  </div>
  </div>
  </div>
  ';
}
?>