<?php
use Firebase\JWT\JWT;
$payload = [
    'iss' => "spiel-franzen.herokuapp.com",
    'aud' => 'www.spiel-franzen.herokuapp.com',
    'exp' => time() + 1000, //10 mint
    'data' => [
        'id' => $id,
        'name' => $name,
        'email' => $email,
    ],
];
$secret_key = "Hochsteller";
$jwt = JWT::encode($payload, $secret_key, 'HS256');
header("Authorization:Bearer {$jwt}");
?>