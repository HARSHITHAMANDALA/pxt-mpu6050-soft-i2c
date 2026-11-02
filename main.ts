
/**
 * MPU6050 Software I2C Extension
 * For micro:bit V2
 *
 * Connect the sensor using ring-compatible GPIO pins.
 * External I2C pull-up resistors are required.
 */

namespace mpu6050soft {
    let sdaPin: DigitalPin = DigitalPin.P1
    let sclPin: DigitalPin = DigitalPin.P2
    let deviceAddress = 0x68

    //% block="initialize MPU6050 SDA $sda SCL $scl"
    //% sda.defl=DigitalPin.P1
    //% scl.defl=DigitalPin.P2
    //% weight=100
    export function initialize(sda: DigitalPin, scl: DigitalPin): void {
        sdaPin = sda
        sclPin = scl

        pins.digitalWritePin(sdaPin, 1)
        pins.digitalWritePin(sclPin, 1)
        control.waitMicros(1000)

        // Wake up the MPU6050
        writeRegister(0x6B, 0x00)

        // Accelerometer range: +/- 2g
        writeRegister(0x1C, 0x00)

        // Gyroscope range: +/- 250 degrees/second
        writeRegister(0x1B, 0x00)

        // Sample-rate divider
        writeRegister(0x19, 0x04)

        control.waitMicros(100000)
    }

    function start(): void {
        pins.digitalWritePin(sdaPin, 1)
        pins.digitalWritePin(sclPin, 1)
        control.waitMicros(5)
        pins.digitalWritePin(sdaPin, 0)
        control.waitMicros(5)
        pins.digitalWritePin(sclPin, 0)
        control.waitMicros(5)
    }

    function stop(): void {
        pins.digitalWritePin(sdaPin, 0)
        pins.digitalWritePin(sclPin, 1)
        control.waitMicros(5)
        pins.digitalWritePin(sdaPin, 1)
        control.waitMicros(5)
    }

    function writeByte(value: number): boolean {
        for (let i = 0; i < 8; i++) {
            pins.digitalWritePin(sdaPin, (value & 0x80) ? 1 : 0)
            control.waitMicros(5)
            pins.digitalWritePin(sclPin, 1)
            control.waitMicros(5)
            pins.digitalWritePin(sclPin, 0)
            value = (value << 1) & 0xFF
        }

        // Read acknowledgement from sensor
        pins.digitalWritePin(sdaPin, 1)
        control.waitMicros(5)
        pins.digitalWritePin(sclPin, 1)
        control.waitMicros(5)
        const acknowledged = pins.digitalReadPin(sdaPin) == 0
        pins.digitalWritePin(sclPin, 0)
        control.waitMicros(5)

        return acknowledged
    }

    function readByte(acknowledge: boolean): number {
        let value = 0
        pins.digitalWritePin(sdaPin, 1)

        for (let i = 0; i < 8; i++) {
            value = (value << 1) & 0xFF
            pins.digitalWritePin(sclPin, 1)
            control.waitMicros(5)
            value |= pins.digitalReadPin(sdaPin)
            pins.digitalWritePin(sclPin, 0)
            control.waitMicros(5)
        }

        // ACK for more data, NACK for the final byte
        pins.digitalWritePin(sdaPin, acknowledge ? 0 : 1)
        control.waitMicros(5)
        pins.digitalWritePin(sclPin, 1)
        control.waitMicros(5)
        pins.digitalWritePin(sclPin, 0)
        pins.digitalWritePin(sdaPin, 1)

        return value
    }

    function writeRegister(register: number, value: number): void {
        start()
        writeByte(deviceAddress << 1)
        writeByte(register)
        writeByte(value)
        stop()
    }

    function readRegister(register: number): number {
        start()
        writeByte(deviceAddress << 1)
        writeByte(register)
        start()
        writeByte((deviceAddress << 1) | 1)
        const value = readByte(false)
        stop()
        return value
    }

    function readSignedWord(register: number): number {
        const high = readRegister(register)
        const low = readRegister(register + 1)
        let value = (high << 8) | low

        if (value > 32767) {
            value -= 65536
        }

        return value
    }

    //% block="accelerometer X raw"
    //% weight=90
    export function accelerationX(): number {
        return readSignedWord(0x3B)
    }

    //% block="accelerometer Y raw"
    //% weight=89
    export function accelerationY(): number {
        return readSignedWord(0x3D)
    }

    //% block="accelerometer Z raw"
    //% weight=88
    export function accelerationZ(): number {
        return readSignedWord(0x3F)
    }

    //% block="gyroscope X raw"
    //% weight=80
    export function gyroscopeX(): number {
        return readSignedWord(0x43)
    }

    //% block="gyroscope Y raw"
    //% weight=79
    export function gyroscopeY(): number {
        return readSignedWord(0x45)
    }

    //% block="gyroscope Z raw"
    //% weight=78
    export function gyroscopeZ(): number {
        return readSignedWord(0x47)
    }

    //% block="accelerometer X in g"
    export function accelerationXg(): number {
        return accelerationX() / 16384
    }

    //% block="accelerometer Y in g"
    export function accelerationYg(): number {
        return accelerationY() / 16384
    }

    //% block="accelerometer Z in g"
    export function accelerationZg(): number {
        return accelerationZ() / 16384
    }

    //% block="gyroscope X in degrees per second"
    export function gyroscopeXdps(): number {
        return gyroscopeX() / 131
    }

    //% block="gyroscope Y in degrees per second"
    export function gyroscopeYdps(): number {
        return gyroscopeY() / 131
    }

    //% block="gyroscope Z in degrees per second"
    export function gyroscopeZdps(): number {
        return gyroscopeZ() / 131
    }
}

