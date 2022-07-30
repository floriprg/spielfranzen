<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet"
        integrity="sha384-gH2yIJqKdNHPEq0n4Mqa/HGKIhSkIHeL5AyhkYV8i59U5AR6csBvApHHNl/vI1Bx" crossorigin="anonymous">
</head>

<body>
    <h1 class="text-center">
        Name des Spiels
    </h1>
    <ul class="nav nav-tabs justify-content-center">
        <li class="nav-item">
            <a class="nav-link" aria-current="page" href="index.php">Spielen</a>
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
</body>

</html>
<?php
echo '<div class="d-flex flex-row">';
echo '
<div>
<div class="card m-3" style="width: 18rem;">
  <img class="card-img-top img-fluid" src="karten/deckblatt.jpg" alt="Card image cap">
    <div class="card-body">
        <h5 class="card-title">Name des Spielers</h5>
    </div>
</div>
<div class="card m-3" style="width: 18rem;">
  <img class="card-img-top img-fluid" src="karten/deckblatt.jpg" alt="Card image cap">
    <div class="card-body">
        <h5 class="card-title">Name des Spielers</h5>
    </div>
</div>
<div class="card m-3" style="width: 18rem;">
  <img class="card-img-top img-fluid" src="karten/deckblatt.jpg" alt="Card image cap">
    <div class="card-body">
        <h5 class="card-title">Name des Spielers</h5>
    </div>
</div>
<div>
<table class="table">
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
  </tbody>
</table>
<div id="karten">

</div>
';
echo '</div>';
?>