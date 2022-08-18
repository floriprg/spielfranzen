<!DOCTYPE html>
<html lang="de">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mein Spiel</title>
    <script src="//code.jquery.com/jquery-1.11.0.min.js"></script>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet"
        integrity="sha384-gH2yIJqKdNHPEq0n4Mqa/HGKIhSkIHeL5AyhkYV8i59U5AR6csBvApHHNl/vI1Bx" crossorigin="anonymous">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
</head>

<body>
    <script>
    </script>
    <h1 class="text-center">
        <?php
require "config.php";
if (isset($_GET['s']) && !($_GET['s'] == "" && !($_GET['s'] == "null"))) {
  $data = sql("select name from spiele where id = " . $_GET['s'] . "");
  while ($row = pg_fetch_row($data)) {
    echo "$row[0]";
  }
}

?> </h1>
    <ul class="nav nav-tabs justify-content-center">
        <li class="nav-item">
            <a class="nav-link" href="home.php">
                Home </a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="index.php"> Spielen </a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="login.php"> Anmelden </a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="register.php">
                Registrieren </a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="rangliste.php">
                Rangliste
            </a>
        </li>
        <li class="nav-item">
            <a class="nav-link active" href="game.php">
                Mein Spiel </a>
        </li>
    </ul>
    <script src="//code.jquery.com/jquery-1.11.0.min.js">
    </script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-A3rJD856KowSb7dwlZdYEkO39Gagi7vIsF0jrRAoQmDKKtQBHUuLZ9AsSv4jD4Xa" crossorigin="anonymous">
    </script>
    <script src="game.js">
    </script>
    <?php begin(); ?>
</body>

</html>
<?php
include 'vendor/autoload.php';
//require "config.php";
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
  $data = gettokendata();
  if (!$data) {
    echo '<div class="alert alert-danger"> Deine Session ist abgelaufen! <a href="login.php">Melde dich bitte erneut an!</a></div>';
    return false;
  }
  $d = sql("select id from spiele where s1->>'name'='" . $data->name . "' or s2->>'name'='" . $data->name . "' or s3->>'name'='" . $data->name . "'");
  while ($row = pg_fetch_row($d)) {
    $id = $row[0];
  }
  if ((!isset($_GET['s']))) {
    if ((pg_num_rows($d) > 0)) {
      echo "<script>window.location = 'game.php?s=" . $id . "'</script>";

    }
    else {
      echo '<div class="alert alert-danger" role="alert">
      Du nimmst noch an keinem Spiel teil! <a href="index.php">Hier</a> findest du die vorhandenen Spiele      
      </div>';
    }
    return false;
  }
  $idvalid = sql("select id from spiele where id = " . $_GET['s'] . "");
  if (!(pg_num_rows($idvalid) > 0)) {
    echo "<div class ='alert-danger alert'>
          Spiel nicht vorhanden!
          </div>";
    return false;
  }
  if ((pg_num_rows($d) > 0) && ($id != $_GET['s'])) {
    echo '<div class="alert alert-danger" role="alert">
            Du nimmst bereits an einem Spiel teil! Klicke <a href="game.php?s=' . $id . '">hier</a> um zu diesem Spiel zu gelangen
            </div>';
    return false;
  }
  $data1 = sql("select s1, s2, s3 from spiele where id = " . $_GET['s'] . ";");
  while ($row = pg_fetch_row($data1)) {
    $name = $data->name;
    ////////////////////////////////
    ///!!!!!!!!!!!!!!!!!!!!!!!!!!///
    ///////////////////////////////
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
    kartenausteilen($s1, $s1->name, $s2->name, $s3->name);
  }
  else if ($s2->name == "offen" || $s2->name == $name) {
    if ($s2->name != $name) {
      $s2->name = $name;
      sql("update spiele set s2 = '" . json_encode($s2) . "' where id = " . $_GET['s'] . ";");
    }
    kartenausteilen($s2, $s1->name, $s2->name, $s3->name);
  }
  else if ($s3->name == "offen" || $s3->name == $name) {
    if ($s3->name != $name) {
      $s3->name = $name;
      sql("update spiele set s3 = '" . json_encode($s3) . "' where id = " . $_GET['s'] . ";");
      sql("update spiele set gestartet = true where id = " . $_GET['s'] . ";");
    }
    kartenausteilen($s3, $s1->name, $s2->name, $s3->name);

  }
  else {
    echo '<div class="alert alert-warning" role="alert">
 Dieses Spiel ist leider schon besetzt
 </div>';
  }
  $dl = sql("select array_upper(ausgeschieden, 1) from spiele where id = " . $_GET['s'] . ";");
  while ($row = pg_fetch_row($dl)) {
    $ausgeschieden = $row[0];
  }
  if ($ausgeschieden < 2) {
    spielauswahl($name);
  }
  else {
    game($name);
  }
}


function game($name)
{
  $data_ausgeschieden = sql("select ausgeschieden[0], ausgeschieden[1] from spiele where id = " . $_GET['s'] . ";");
  while ($row = pg_fetch_row($data_ausgeschieden)) {
    $ausgeschieden1 = $row[0];
    $ausgeschieden2 = $row[1];
  }
  if ($ausgeschieden1 == $name || $ausgeschieden2 == $name) {
    return false;
  }
  $data_spielart = sql("select spielart from spiele where id = " . $_GET['s'] . ";");
  while ($row = pg_fetch_row($data_spielart)) {
    $spielart = $row[0];
  }
  sql("update spiele set spieler = '" . $name . "' where id = " . $_GET['s'] . ";");
  echo '<div class="modal fade" id="exampleModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel"
        aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="exampleModalLabel">Was möchtest du spielen?</h5>
                    <button type="button" class="close" data-bs-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-footer">
                    <form method="post"><div>';
  for ($i = $spielart; $i < 13; $i++) {
    echo '
            <div class="form-check">
              <input class="form-check-input" type="radio" name="spielart" value="' . $i . '" id="flexRadioDefault' . $i . '"
                  checked />
              <label class="form-check-label" for="flexRadioDefault' . $i . '">' . $i . '</label>
            </div>
        ';
  }
  echo '</div>
  <input type="submit" name="submit" value ="OK">
  </form>
                </div>
            </div>
        </div>
    </div>';
  echo '<script type="text/javascript">
      $(window).load(function() {
          $("#exampleModal").modal("show");
      });
      </script>';
  if (isset($_POST['submit'])) {
    sql("update spiele set spielart =" . $_POST['spielart'] . "; ");
  }

  echo "<script src='index.js'></script>";


}

function kartenausteilen($s, $n1, $n2, $n3)
{
  $data = sql("select jetztdran from spiele where id =" . $_GET['s'] . ";");
  while ($row = pg_fetch_row($data)) {
    $jetztdran = $row[0];
  }

  $data_karten = sql("select ablegkarten[1], ablegkarten[2], ablegkarten[3] from spiele where id = " . $_GET['s']);
  try {

    while ($row = pg_fetch_row($data_karten)) {
      $a_karte1 = $row[0];
      $a_karte2 = $row[1];
      $a_karte3 = $row[2];
    }
  }
  catch (\Throwable $th) {
  //
  }
  echo '<div class="container">';
  echo '
  <div class="d-flex flex-wrap justify-content-center">
    <div class="card m-2" style="width: 6rem;">
      <img id="ableg1"  class="card-img-top img-fluid" src="' . ((!$a_karte1) ? 'karten/deckblatt.jpg' : $a_karte1) . '" alt="Karte 1">
      <div class="card-body">
        <h5 class="card-title">' . $n1 . '</h5>
        <p>' . (($jetztdran == "s1") ? 'jetzt dran' : '') . '</p>
      </div>
    </div>
    <div  class="card m-2" style="width: 6rem;">
      <img  id="ableg2"  class="card-img-top img-fluid" src="' . ((!$a_karte2) ? 'karten/deckblatt.jpg' : $a_karte2) . '" alt="Karte 2">
      <div class="card-body">
        <h5 class="card-title">' . $n2 . '</h5>
        <p>' . (($jetztdran == "s2") ? 'jetzt dran' : '') . '</p>
      </div>
    </div>
    <div  class="card m-2" style="width: 6rem;">
      <img id="ableg3" class="card-img-top img-fluid" src="' . ((!$a_karte3) ? 'karten/deckblatt.jpg' : $a_karte3) . '" alt="Karte 3">
      <div class="card-body">
        <h5 class="card-title">' . $n3 . '</h5>
        <p>' . (($jetztdran == "s3") ? 'jetzt dran' : '') . '</p>
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
  $data = sql("select anzahl from spiele where id = " . $_GET['s'] . ";");
  while ($row = pg_fetch_row($data)) {
    $anzahl = $row[0];
  }
  for ($i = 1; $i < $anzahl + 1; $i++) {
    echo '<tr>
            <th scope="row">' . $i . '</th>
          </tr>';
  }
  $d = sql("select spielart from spiele where id = " . $_GET['s'] . "");
  while ($row = pg_fetch_row($d)) {
    $spielart = $row[0];
  }
  echo '
  <tr><th>Spielart</th><th>' . $spielart . '</th></tr>
  </tbody>
  </table>
  </div>
  </div>
  <div class="d-flex flex-row">';

  for ($i = 0; $i < 9; $i++) {
    echo json_encode($s->karten);
    echo $s->karten[0];
    echo '<div class="card m-0.5" style="width: 9vw;">
    <img  id="' . $i . '" class="card-img-top img-fluid" src="karten/' . (!(isset($s->karten[$i])) ? 'deckblatt.jpg' : $s->karten[$i]) . '" alt="Card image cap"> 
    </div>';
  }
  echo '
  </div>
  </div>
  </div>
  ';

}

function spielauswahl($name)
{
  $fragen = false;
  $data_ausgeschieden = sql("select ausgeschieden from spiele");
  while ($row = pg_fetch_row($data_ausgeschieden)) {
    $ausgeschieden = $row[0];
  }
  if (isset($ausgeschieden[0]))
    if ($ausgeschieden[0] == $name || $ausgeschieden[1] == $name) {
      return false;
    }


  $data = sql("select jetztdran, spielart, gehebt from spiele where id =" . $_GET['s'] . ";");
  while ($row = pg_fetch_row($data)) {
    $jetztdran = $row[0];
    $spielart = $row[1];
    $gehebt = $row[2];
  }
  $data2 = sql("select " . $jetztdran . "->>'name' AS name from spiele where id =" . $_GET['s'] . ";");
  while ($row = pg_fetch_row($data2)) {
    if ($row[0] == $name) {
      $fragen = true;
    }
    else {
      $fragen = false;
    }
    echo "Name: $name<br>";
    echo "jetztdran: $row[0]<br>";
  }



  if ($fragen) {
    if (($spielart > 4) && ($gehebt == "f")) {
      $bieten_heben = "heben";

      switch ($jetztdran) {
        case 's1':
          $jetztdran = "s3";
          break;
        case 's2':
          $jetztdran = "s1";
          break;
        case 's3':
          $jetztdran = "s2";
          break;
      }
      if (isset($_POST['ja'])) {
        echo "<script>window.location.reload();</script>";
        sql("update spiele set spielart = " . ($spielart + 1) . " where id =" . $_GET['s'] . "; update spiele set gehebt = true where id =" . $_GET['s'] . ";update spiele set jetztdran = '" . $jetztdran . "' where id =" . $_GET['s'] . ";");
      }
      if (isset($_POST['nein'])) {
        echo "<script>window.location.reload();</script>";
        sql("update spiele set gehebt = false where id =" . $_GET['s'] . ";update spiele set jetztdran = '" . $jetztdran . "' where id =" . $_GET['s'] . "; update spiele set ausgeschieden = ausgeschieden || '{" . $name . "}';");
      }
    }
    else {
      $bieten_heben = "bieten";

      switch ($jetztdran) {
        case 's1':
          $jetztdran = "s2";
          break;
        case 's2':
          $jetztdran = "s3";
          break;
        case 's3':
          $jetztdran = "s1";
          break;
      }
      if (isset($_POST['ja'])) {
        echo "<script>window.location.reload();</script>";
        sql("update spiele set jetztdran = '" . $jetztdran . "' where id =" . $_GET['s'] . ";");
        if ($spielart > 4) {
          sql("update spiele set gehebt = false where id =" . $_GET['s'] . ";");
        }
        else {
          sql("update spiele set spielart = " . ($spielart + 1) . " where id =" . $_GET['s'] . "");
        }
      }
      if (isset($_POST['nein'])) {
        echo "<script>window.location.reload();</script>";
        sql("update spiele set jetztdran = '" . $jetztdran . "' where id =" . $_GET['s'] . "; update spiele set ausgeschieden = ausgeschieden || '{" . $name . "}';");
      }
    }
    echo '
    <!-- Modal -->
    <div class="modal fade" id="exampleModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel"
        aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="exampleModalLabel"> Möchtest du ' . $spielart . ' ' . $bieten_heben . '?</h5>
                    <button type="button" class="close" data-bs-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-footer">
                    <form method="post">
                      <input type="submit" value="ja" name="ja" class="btn btn-primary">
                      <input type="submit" value="nein" name="nein" class="btn btn-primary">
                    </form>
                </div>
            </div>
        </div>
    </div>';
    echo '<script type="text/javascript">
      $(window).load(function() {
          $("#exampleModal").modal("show");
      });
      </script>';
  }

}
?>