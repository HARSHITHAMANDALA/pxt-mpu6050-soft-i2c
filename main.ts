namespace softI2C {
    //% block="read pin $pin"
    //% pin.defl=DigitalPin.P1
    export function readPin(pin: DigitalPin): number {
        return pins.digitalReadPin(pin);
    }
}
