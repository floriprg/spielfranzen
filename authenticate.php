<?php
include 'vendor/autoload.php';
require "config.php";
use \Firebase\JWT\JWT;
$now = time();
$secret_Key = 'JWT_SECRET';
$date = new DateTimeImmutable();
$expire_at = $date->modify('+6 minutes')->getTimestamp(); // Add 60 seconds
$domainName = "JWT_AUD";
$username = "username"; // Retrieved from filtered POST data
$request_data = ['iat' => $date->getTimestamp(), // Issued at: time when the token was generated  
    'iss' => $domainName, // Issuer      
    'nbf' => $date->getTimestamp(), // Not before   
    'exp' => $expire_at, // Expire    
    'userName' => $row[3], // User name
];
echo JWT::encode($request_data, $secret_Key, 'HS512'
);
?>