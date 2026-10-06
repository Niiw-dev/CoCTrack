<?php

namespace App\Exceptions;

use Exception;

/**
 * La API de Clash of Clans rechazó el token (401, o 403 con IP/autorización inválida).
 *
 * Se lanza de forma explícita para que nunca se confunda con una respuesta de negocio
 * (p.ej. "no hay guerra" o "warlog privado") y el sync falle de manera visible.
 */
class CocApiAuthException extends Exception {}
