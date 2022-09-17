<?php
include 'vendor/autoload.php';
include_once "config.php";
function neuekarten()
{
  $karten = array("6laub.jpg", "6sche.jpg", "6eich.jpg", "6herz.jpg", "2laub.jpg", "2sche.jpg", "2eich.jpg", "2herz.jpg", "3laub.jpg", "3sche.jpg", "3eich.jpg", "3herz.jpg", "4laub.jpg", "4sche.jpg", "4eich.jpg", "4herz.jpg", "5eich.jpg", "5herz.jpg", "5laub.jpg", "5sche.jpg", "7eich.jpg", "7herz.jpg", "7laub.jpg", "7sche.jpg", "8eich.jpg", "8herz.jpg", "8laub.jpg", "8sche.jpg", "9eich.jpg", "9herz.jpg", "9laub.jpg", "9sche.jpg", "1sche.jpg");
  $zufallskarten = [];
  for ($i = 0; $i < 33; $i++) {
    $zahl = rand(0, (count($karten) - 1));
    $zufallskarten[] = $karten[$zahl];
    array_splice($karten, $zahl, 1);
  }
  return $zufallskarten;
}

function main()
{
  if (!(errors_at_begin())) {
    return false;
  }
  // if (!(spielpasswort())) {
  //   return false;
  // }
  platzZuweisung();
}

function spielpasswort()
{
  $d = sql("select spielpasswort from spiele where id = " . $_GET['s']);
  while ($row = pg_fetch_row($d)) {
    $spielpasswort = $row[0];
  }
  if ($spielpasswort) {
    echo "<input class='form-control' type='password' name='pwd' placeholder='Gib das Passwort für das Spiel ein '>
    <input type='submit' name='submit' placeholder = 'OK'>";
    if (isset($_POST['submit'])) {
      if ($spielpasswort == $_POST['pwd']) {
        return true;
      }
      else {
        return false;
      }
    }
  }
}
function errors_at_begin()
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
  $idvalid = sql("select id from spiele where id = " . $_GET['s']);
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
  return true;
}
function platzZuweisung()
{
  $data1 = sql("select s1, s2, s3 from spiele where id = " . $_GET['s']);
  while ($row = pg_fetch_row($data1)) {
    $data = gettokendata();
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
    $data = sql("select kartenausgeteilt from spiele where id =" . $_GET['s']);
    while ($row = pg_fetch_row($data)) {
      if ($row[0] == "f") {
        sql("update spiele set kartenausgeteilt = true where id = " . $_GET['s']);
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
      sql("update spiele set s1 = '" . json_encode($s1) . "' where id = " . $_GET['s']);
      sql("update spiele set s2 = '" . json_encode($s2) . "' where id = " . $_GET['s']);
      sql("update spiele set s3 = '" . json_encode($s3) . "' where id = " . $_GET['s']);
      sql("update spiele set talon =  '{" . $talon[0] . ", " . $talon[1] . ", " . $talon[2] . "}' where id = " . $_GET['s']);
    }
    kartenausteilen($s1, $s1->name, $s2->name, $s3->name);
  }
  else if ($s2->name == "offen" || $s2->name == $name) {
    if ($s2->name != $name) {
      $s2->name = $name;
      sql("update spiele set s2 = '" . json_encode($s2) . "' where id = " . $_GET['s']);
    }
    kartenausteilen($s2, $s1->name, $s2->name, $s3->name);
  }
  else if ($s3->name == "offen" || $s3->name == $name) {
    if ($s3->name != $name) {
      $s3->name = $name;
      sql("update spiele set s3 = '" . json_encode($s3) . "' where id = " . $_GET['s']);
      sql("update spiele set gestartet = true where id = " . $_GET['s']);
    }
    kartenausteilen($s3, $s1->name, $s2->name, $s3->name);

  }
  else {
    echo '<div class="alert alert-warning" role="alert">
 Dieses Spiel ist leider schon besetzt
 </div>';
  }
  $dl = sql("select array_upper(ausgeschieden, 1), spieler from spiele where id = " . $_GET['s']);
  while ($row = pg_fetch_row($dl)) {
    $ausgeschieden = $row[0];
    $spieler = $row[1];
  }
  if ($ausgeschieden < 2) {
    spielauswahl($name);
  }
  else {
    if ($spieler == "") {
      gameselect($name, $s1, $s2, $s3);
    }
    else {
      game($name);
    }
  }
}
function gameselect($name, $s1, $s2, $s3)
{

  $data_ausgeschieden = sql("select ausgeschieden, spielart, spielausgewählt from spiele where id = " . $_GET['s'] . ";");
  while ($row = pg_fetch_row($data_ausgeschieden)) {
    $ausgeschieden = explode(",", trim($row[0], '{}'));
    $spielart = $row[1];
    $spielausgewählt = $row[2];
  }
  if ($ausgeschieden[0] == $name || $ausgeschieden[1] == $name) {
    echo '<div class="alert alert-danger">Du bist ausgeschieden</div>';
    return false;
  }
  if ($spielausgewählt == null) {
    echo '<div class="modal fade" id="exampleModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel"
        aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title" id="exampleModalLabel">Was möchtest du spielen?</h2>
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
    </div><script type="text/javascript">
      $(window).on("load", function () {
        $("#exampleModal").modal("show");
      });
    </script>';
  }

  if (isset($_POST['submit']) && ($_SERVER['REQUEST_METHOD'] == 'POST')) {
    switch ($_POST['spielart']) {
      case '5':
        $trumpf = "eich";
        break;
      case '6':
        $trumpf = "laub";
        break;
      case '7':
        $trumpf = "sche";
        break;
      case '8':
        $trumpf = "herz";
        break;
      default:
        $trumpf = null;
    }
    switch ($name) {
      case ($s1->name):
        $spielstarterderrunde = 0;
        break;
      case ($s2->name):
        $spielstarterderrunde = 1;
        break;
      case ($s3->name):
        $spielstarterderrunde = 2;
        break;
    }
    echo "<script>window.location.reload();</script>";
    sql("update spiele set trumpf = '" . $trumpf . "', spielart =" . $_POST['spielart'] . ", spielstarterderrunde = " . $spielstarterderrunde . ", spielausgewählt = true, spieler = '" . $name . "' where id = " . $_GET['s']);
    talonzeigen(); //geht nicht!!!

  }
}

function talonzeigen()
{
  //checkbox mit bildern
  //zuerst talonkarten auswählen danach eigene karten auswählen
  $data = sql("select talon[1],talon[2],talon[3], jetztdran, spielart from spiele where id =" . $_GET['s']);
  //header("Location: game.php");

  while ($row = pg_fetch_row($data)) {
    $t1 = $row[0];
    $t2 = $row[1];
    $t3 = $row[2];
    $jetztdran = $row[3];
    $spielart = $row[4];
  }
  if ($spielart > 10) { //bei doppelbettl oder doppelmord
    return false;
  }
  $data2 = sql("select " . $jetztdran . " from spiele where id =" . $_GET['s']);
  while ($row = pg_fetch_row($data2)) {
    $s = json_decode($row[0]);
  }
  echo '<div class="modal fade " id="talonmodal" tabindex="-1" role="dialog" aria-labelledby="talonmodalLabel"aria-hidden="true">
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content ">
                <div class="modal-header ">
                    <button type="button" class="close" data-bs-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                  <form method="post" class="">
                    <h5 class="modal-title" id="talonmodalLabel">Wähle die Talonkarten aus die du möchtest</h5>
                    <div class="modal-footer ">
                      <div class="form-check">
                        <input class="form-check-input talon" type="checkbox" value="' . $t1 . '" id="" name="talon0">
                        <label class="form-check-label" for="">
                            <img src="karten/' . $t1 . '" class="img-fluid" alt="image desc">
                        </label>
                      </div>
                      <div class="form-check">
                        <div class="form-check">
                          <input class="form-check-input talon" type="checkbox" value="' . $t2 . '" id="" name="talon1">
                          <label class="form-check-label" for="">
                            <img src="karten/' . $t2 . '" class="img-fluid" alt="image desc">
                          </label>
                        </div>
                      </div>
                      <div class="form-check">
                        <div class="form-check">
                          <input class="form-check-input talon" type="checkbox" value="' . $t3 . '" id="" name="talon2">
                          <label class="form-check-label" for="">
                            <img src="karten/' . $t3 . '" class="img-fluid" alt="image desc">
                          </label>
                        </div>
                      </div>
                    </div>
                    <h5 class="modal-title" id="talonmodalLabel">Wähle die Karten aus die du nicht brauchst</h5>
                    <div class="modal-footer ">
                      ';
  for ($i = 0; $i < 10; $i++) {
    echo '
                      <div class="form-check">
                        <div class="form-check">
                          <input name="k' . $i . '" class="form-check-input deinekarten" type="checkbox" value="" id="" name="deinekarten">
                          <label class="form-check-label" for="">
                            <img  src="karten/' . $s->karten[$i] . '" class="img-fluid" alt="image desc">
                          </label>
                        </div>
                      </div>
                      ';
  }

  echo '
                    </div>
                    <input type="submit" name="talonausgewählt" value="OK">
                </form>
            </div>
        </div>
        </div>
        <script type="text/javascript">
          $("input.deinekarten").on("change", function (evt) {
            var limit = $("input[name=\"talon0\"]:checked").length + $("input[name=\"talon1\"]:checked").length + $("input[name=\"talon2\"]:checked").length;
            if (($("input[name=\"deinekarten\"]:checked").length) > limit) {
              this.checked = false;
            }
          });
          $(window).on("load", function () {
            $("#talonmodal").modal("show");
          });
        </script>';
  if (isset($_POST['talonausgewählt'])) {
    $kartenausgewählt = [];
    $talonkartenausgewählt = [];
    for ($i = 0; $i < 10; $i++) {
      if (isset($_POST['k' . $i])) {
        $kartenausgewählt[] = $i;
      }
      if (isset($_POST['talon' . $i])) {
        $talonkartenausgewählt[] = $_POST['talon' . $i];
      }
    }
    if (count($kartenausgewählt) != count($talonkartenausgewählt)) {
      talonzeigen();
      return false;
    }
    $karten = $s->karten;
    switch (count($kartenausgewählt)) {
      case 1:
        $karten[$kartenausgewählt[0]] = $talonkartenausgewählt[0];
        break;
      case 2:
        $karten[$kartenausgewählt[0]] = $talonkartenausgewählt[0];
        $karten[$kartenausgewählt[1]] = $talonkartenausgewählt[1];
        break;
      case 3:
        $karten[$kartenausgewählt[0]] = $talonkartenausgewählt[0];
        $karten[$kartenausgewählt[1]] = $talonkartenausgewählt[1];
        $karten[$kartenausgewählt[2]] = $talonkartenausgewählt[2];
        break;
    }
    $s->karten = $karten;
    $sqlstr = "update spiele set " . $jetztdran . " = '" . json_encode($s) . "' where id = " . $_GET['s'];
    echo $sqlstr;
    echo "<script>window.location.reload();</script>";
    sql($sqlstr);
  }
}

function game($name)
{
  echo "<script src='index.js'></script>";
}



function kartenausteilen($s, $n1, $n2, $n3)
{
  $data = sql("select jetztdran, spielrunde from spiele where id =" . $_GET['s']);
  while ($row = pg_fetch_row($data)) {
    $jetztdran = $row[0];
    $spielrunde = $row[1];
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
    new error($th);
  }
  echo '<div class="container">';
  echo '
  <div class="d-flex flex-column justify-content-center">
    <div class = "d-flex flex-wrap justify-content-center">
    <div class = "d-flex flex-row justify-content-center">
    <div  class="card m-2" style="width: 30vw; max-width: 120px">
      <img id="ableg1"  class="card-img-top img-fluid" src="karten/' . (($a_karte1 == "keine") ? 'deckblatt.jpg' : $a_karte1) . '" alt="Karte 1">
      <div class="card-body">
        <h5 class="card-title">' . $n1 . '</h5>
        <p>' . (($jetztdran == "s1") ? 'jetzt dran' : '') . '</p>
      </div>
    </div>
    <div  class="card m-2" style="width: 30vw; max-width: 120px">
      <img  id="ableg2"  class="card-img-top img-fluid" src="karten/' . (($a_karte2 == "keine") ? 'deckblatt.jpg' : $a_karte2) . '" alt="Karte 2">
      <div class="card-body">
        <h5 class="card-title">' . $n2 . '</h5>
        <p>' . (($jetztdran == "s2") ? 'jetzt dran' : '') . '</p>
      </div>
    </div>
    <div  class="card m-2" style="width: 30vw; max-width: 120px">
      <img id="ableg3" class="card-img-top img-fluid" src="karten/' . (($a_karte3 == "keine") ? 'deckblatt.jpg' : $a_karte3) . '" alt="Karte 3">
      <div class="card-body">
        <h5 class="card-title">' . $n3 . '</h5>
        <p>' . (($jetztdran == "s3") ? 'jetzt dran' : '') . '</p>
      </div>
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
    <th scope="col">' . $n1 . '</th>
    <th scope="col">' . $n2 . '</th>
    <th scope="col">' . $n3 . '</th>
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
  </div>
  <div class="d-flex flex-row">';
  $count = count($s->karten);
  for ($i = 0; $i < $count; $i++) {
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
  $data = sql("select jetztdran, spielart, gehebt from spiele where id =" . $_GET['s'] . ";");
  while ($row = pg_fetch_row($data)) {
    $jetztdran = $row[0];
    $jetztdran2 = $row[0];
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
  }

  $data_ausgeschieden = sql("select ausgeschieden, jetztdran from spiele where id = " . $_GET['s']);
  while ($row = pg_fetch_row($data_ausgeschieden)) {
    $ausgeschieden = explode(",", trim($row[0], '{}'));

  }
  if (isset($ausgeschieden[0]) && isset($ausgeschieden[1])) {
    return false;
  }

  if ($fragen) { //wenn dieser Spieler dran ist
    fragestellen($jetztdran, $ausgeschieden, $name, $spielart, $gehebt);
  }

}


function fragestellen($jetztdran, $ausgeschieden, $name, $spielart, $gehebt)
{
  switch ($jetztdran) {
    case 's1':
      $jetztdran2 = "s2";
      break;
    case 's2':
      $jetztdran2 = "s3";
      break;
    case 's3':
      $jetztdran2 = "s1";
      break;
  }
  if ($ausgeschieden[0] == $name) {
    sql("update spiele set jetztdran = '" . $jetztdran2 . "'");
    echo '<div class="alert alert-danger">Du bist ausgeschieden</div>';
    return false;
  }
  $frage_gestellt = false;
  if (($spielart > 4) && ($gehebt == "f")) {
    $bieten_heben = "heben";
    frage($spielart, $bieten_heben, $frage_gestellt);
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
    if (isset($_POST['ja']) && ($_SERVER['REQUEST_METHOD'] == 'POST')) {
      echo "<script>window.location.reload()</script>";
      sql("update spiele set spielart = " . ($spielart + 1) . ", gehebt = true, jetztdran = '" . $jetztdran . "' where id =" . $_GET['s']);
      $frage_gestellt = true;
    }
    if (isset($_POST['nein']) && ($_SERVER['REQUEST_METHOD'] == 'POST')) {
      echo "<script>window.location.reload()</script>";
      sql("update spiele set gehebt = false, jetztdran = '" . $jetztdran . "', ausgeschieden = ausgeschieden || '{" . $name . "}' where id =" . $_GET['s']);
      $frage_gestellt = true;
    }
  }
  else {
    $bieten_heben = "bieten";
    frage($spielart, $bieten_heben, $frage_gestellt);
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
    if (isset($_POST['ja']) && ($_SERVER['REQUEST_METHOD'] == 'POST')) {

      if (($spielart > 4)) {
        echo "<script>window.location.reload()</script>";

        sql("update spiele set gehebt = false, jetztdran = '" . $jetztdran . "' where id =" . $_GET['s']);
      }
      else {
        echo "<script>window.location.reload()</script>";
        sql("update spiele set spielart = " . ($spielart + 1) . ", jetztdran = '" . $jetztdran . "' where id =" . $_GET['s']);
      }
      $frage_gestellt = true;
    }
    if (isset($_POST['nein']) && ($_SERVER['REQUEST_METHOD'] == 'POST')) {
      echo " <script>window.location.reload()</script>";
      sql("update spiele set jetztdran = '" . $jetztdran . "', ausgeschieden = ausgeschieden || '{" . $name . "}' where id =" . $_GET['s']);
      $frage_gestellt = true;
    }
  }
}
function frage($spielart, $bieten_heben, $frage_gestellt)
{
  echo '
    <!-- Modal -->
    <div class="modal fade" id="frage_modal" tabindex="-1" role="dialog" aria-labelledby="frage_modalLabel"
      aria-hidden="true">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title" id="frage_modalLabel"> Möchtest du ' . $spielart . ' ' . $bieten_heben . '?</h2>
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
  echo '<script id="modalshow" type="text/javascript">
    $(window).on("load", function () {
      $("#frage_modal").modal("show");
    });
  </script>';
}
?>
<!DOCTYPE html>
<html lang="de">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mein Spiel</title>
    <link rel="icon" type="image/jpg" href="karten/weliicon.jpg">
    <meta name="description"
        content="Spiele Spiel Franzen online gegen echte Gegner! Nimm an einem Spiel teil oder beginne dein eigenes! Für 3 Spieler.">
    <meta name="keywords" content="Spiel Franzen">
    <meta name="language" content="de">
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet"
        integrity="sha384-gH2yIJqKdNHPEq0n4Mqa/HGKIhSkIHeL5AyhkYV8i59U5AR6csBvApHHNl/vI1Bx" crossorigin="anonymous">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
</head>

<body>
    <script>
    if (window.history.replaceState) {
        window.history.replaceState(null, null, window.location);
    }
    </script>
    <h1 class="text-center">
        <?php
include_once "config.php";
if (isset($_GET['s']) && !($_GET['s'] == "" && !($_GET['s'] == "null"))) {
  $data = sql("select name from spiele where id = " . $_GET['s'] . "");
  while ($row = pg_fetch_row($data)) {
    echo "$row[0]";
  }
}

?>
    </h1>
    <ul id="nav" class="nav nav-tabs justify-content-center">
        <li class="nav-item">
            <a class="nav-link " href="home.php">
                Home
            </a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="index.php">Spielen</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="login.php">
                Anmelden
            </a>
        </li>
        <li class="nav-item">
            <a class="nav-link " href="register.php">Registrieren</a>
        </li>
        <li class="nav-item">
            <a class="nav-link" href="rangliste.php">Rangliste</a>
        </li>
        <li class="nav-item">
            <a class="nav-link active" href="game.php">Mein Spiel</a>
        </li>
    </ul>
    <style src="style.css"></style>
    </script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-A3rJD856KowSb7dwlZdYEkO39Gagi7vIsF0jrRAoQmDKKtQBHUuLZ9AsSv4jD4Xa" crossorigin="anonymous">
    </script>

    <script src="game.js">
    </script>
    <?php main(); ?>
</body>

</html>