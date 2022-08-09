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
        Name des Spiels
    </h1>
    <ul class="nav nav-tabs justify-content-center">
        <li class="nav-item">
            <button class="nav-link "
                onclick=" const params = new Proxy(new URLSearchParams(window.location.search), {get: (searchParams, prop) => searchParams.get(prop),});window.location ='index.php?to=' + params.to;">Spielen</button>
        </li>
        <li class="nav-item">
            <button class="nav-link "
                onclick=" const params = new Proxy(new URLSearchParams(window.location.search), {get: (searchParams, prop) => searchParams.get(prop),});window.location ='login.php?to=' + params.to;">Anmelden</button>
        </li>
        <li class="nav-item">
            <button class="nav-link"
                onclick=" const params = new Proxy(new URLSearchParams(window.location.search), {get: (searchParams, prop) => searchParams.get(prop),});window.location ='register.php?to=' + params.to;">Registrieren</button>
        </li>
        <li class="nav-item">
            <button class="nav-link"
                onclick=" const params = new Proxy(new URLSearchParams(window.location.search), {get: (searchParams, prop) => searchParams.get(prop),});window.location ='rangliste.php?to=' + params.to;">Rangliste</button>
        </li>
        <li class="nav-item">
            <button class="nav-link active"
                onclick=" const params = new Proxy(new URLSearchParams(window.location.search), {get: (searchParams, prop) => searchParams.get(prop),});window.location ='game.php?to=' + params.to;">Mein
                Spiel</button>
        </li>
    </ul>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-A3rJD856KowSb7dwlZdYEkO39Gagi7vIsF0jrRAoQmDKKtQBHUuLZ9AsSv4jD4Xa" crossorigin="anonymous">
    </script>
    <script src="game.js"></script>
</body>

</html>
<?php
require "config.php";
while ($row = pg_fetch_row(sql("select s1, s2, s3 from spiele where id = " . $_GET['s'] . ";"))) {
  $name = gettokendata()->name;
  $s1 = json_decode($row[0], false);
  $s2 = json_decode($row[1], false);
  $s3 = json_decode($row[2], false);
  if ($s1->name == "offen") {
    $s1->name = $name;
    sql("insert into spiele (s1) values '$s1'");
    kartenausteilen();
  }
  else if ($s2->name == "offen") {
    $s2->name = $name;
    sql("insert into spiele (s2) values '$s2'");
    kartenausteilen();

  }
  else if ($s3->name == "offen") {
    $s3->name = $name;
    sql("insert into spiele (s3) values '$s3'");
    kartenausteilen();

  }
  else {
    echo '<div class="alert alert-warning" role="alert">
        Dieses Spiel ist leider schon besetzt
        </div>';
  }
}
function kartenausteilen()
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
  <tbody>
  <tr>
    <th scope="row">1</th>
    <td>100</td>
    <td>-50</td>
    <td>-50</td>
  </tr>
  <tr>
    <th scope="row">2</th>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <th scope="row">3</th>
    <td>100</td>
    <td>-50</td>
    <td>-50</td>
  </tr>
  <tr>
    <th scope="row">4</th>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <th scope="row">5</th>
    <td>100</td>
    <td>-50</td>
    <td>-50</td>
  </tr>
  <tr>
    <th scope="row">6</th>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <th scope="row">7</th>
    <td>100</td>
    <td>-50</td>
    <td>-50</td>
  </tr>
  <tr>
    <th scope="row">9</th>
    <td>0</td>
    <td>0</td>
    <td>0</td>
  </tr>
  <tr>
    <th scope="row">10</th>
    <td>100</td>
    <td>-50</td>
    <td>-50</td>
  </tr>

  </tbody>
  </table>
  </div>
  </div>';
  echo '
  <div class="d-flex flex-row">
  <div class="card m-0.5" style="width: 9vw;">
  <img class="card-img-top img-fluid" src="karten/deckblatt.jpg" alt="Card image cap"> 
  </div>
  <div class="card m-0.5" style="width: 9vw;">
  <img class="card-img-top img-fluid" src="karten/deckblatt.jpg" alt="Card image cap"> 
  </div>
  <div class="card m-0.5" style="width: 9vw;">
  <img class="card-img-top img-fluid" src="karten/deckblatt.jpg" alt="Card image cap">
  </div>
  <div class="card m-0.5" style="width: 9vw;">
  <img class="card-img-top img-fluid" src="karten/deckblatt.jpg" alt="Card image cap">
  </div>
  <div class="card m-0.5" style="width: 9vw;">
  <img class="card-img-top img-fluid" src="karten/deckblatt.jpg" alt="Card image cap">
  </div>
  <div class="card m-0.5" style="width: 9vw;">
  <img class="card-img-top img-fluid" src="karten/deckblatt.jpg" alt="Card image cap"> 
  </div>
  <div class="card m-0.5" style="width: 9vw;">
  <img class="card-img-top img-fluid" src="karten/deckblatt.jpg" alt="Card image cap"> 
  </div>
  <div class="card m-0.5" style="width: 9vw;">
  <img class="card-img-top img-fluid" src="karten/deckblatt.jpg" alt="Card image cap">
  </div>
  <div class="card m-0.5" style="width: 9vw;">
  <img class="card-img-top img-fluid" src="karten/deckblatt.jpg" alt="Card image cap">
  </div>
  <div class="card m-0.5" style="width: 9vw;">
  <img class="card-img-top img-fluid" src="karten/deckblatt.jpg" alt="Card image cap">
  </div>
  </div>
  ';
  echo '</div>
  </div>
  ';
}
?>