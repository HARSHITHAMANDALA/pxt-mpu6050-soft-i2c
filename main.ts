
/**
 * MPU6050 Software I2C Extension
 * micro:bit V2
 *
 * SDA and SCL can use GPIO pins such as P1 and P2.
 * External I2C pull-up resistors are required.
 *
 * Default MPU6050 configuration:
 * Accelerometer: +/- 2g
 * Gyroscope: +/- 250 degrees/second
 */

namespace mpu6050soft {
    let sdaPin: DigitalPin = DigitalPin.P1
    let sclPin: DigitalPin = DigitalPin.P2
    let deviceAddress = 0x68
    let initialized = false

    // Release a line by switching it to input with no internal pull.
    // The external pull-up resistor brings the line HIGH.
    function releaseLine(pin: DigitalPin): void {
        pins.setPull(pin, PinPullMode.PullNone)
        pins.digitalReadPin(pin)
    }

    // I2C open-drain behaviour: drive LOW or release the line.
    function driveLow(pin: DigitalPin): void {
        pins.digitalWritePin(pin, 0)
    }

    function releaseSDA(): void {
        releaseLine(sdaPin)
    }

    function releaseSCL(): void {
        releaseLine(sclPin)
    }

    function clockHigh(): void {
        releaseSCL()
        control.waitMicros(5)
    }

    function clockLow(): void {
        driveLow(sclPin)
        control.waitMicros(5)
    }

    function start(): void {
        releaseSDA()
        releaseSCL()
        control.waitMicros(5)
        driveLow(sdaPin)
        control.waitMicros(5)
        clockLow()
    }

    function stop(): void {
        driveLow(sdaPin)
        control.waitMicros(5)
        clockHigh()
        releaseSDA()
        control.waitMicros(5)
    }

    // Write one byte and check for the sensor's ACK.
    function writeByte(value: number): boolean {
        for (let i = 7; i >= 0; i--) {
            if ((value & (1 << i)) != 0) {
                releaseSDA()
            } else {
                driveLow(sdaPin)
            }

            control.waitMicros(5)
            clockHigh()
            clockLow()
        }

        // Release SDA so the sensor can acknowledge.
        releaseSDA()
        control.waitMicros(5)
        clockHigh()

        const acknowledged = pins.digitalReadPin(sdaPin) == 0

        clockLow()
        releaseSDA()

        return acknowledged
    }

    // Read one byte; ACK if more bytes follow, otherwise NACK.
    function readByte(acknowledge: boolean): number {
        let value = 0
        releaseSDA()

        for (let i = 0; i < 8; i++) {
            value = value << 1

            clockHigh()
            if (pins.digitalReadPin(sdaPin) != 0) {
                value = value | 1
            }
            clockLow()
        }

        if (acknowledge) {
            driveLow(sdaPin)
        } else {
            releaseSDA()
        }

        control.waitMicros(5)
        clockHigh()
        clockLow()
        releaseSDA()

        return value
    }

    function writeRegisterInternal(
        register: number,
        value: number
    ): boolean {
        start()

        let ok = writeByte((deviceAddress << 1) & 0xFE)
        if (ok) {
            ok = writeByte(register & 0xFF)
        }
        if (ok) {
            ok = writeByte(value & 0xFF)
        }

        stop()
        return ok
    }

    function readRegistersInternal(
        register: number,
        count: number
    ): number[] {
        const result: number[] = []

        if (count <= 0 || count > 32) {
            return result
        }

        start()

        let ok = writeByte((deviceAddress << 1) & 0xFE)

        if (ok) {
            ok = writeByte(register & 0xFF)
        }

        if (!ok) {
            stop()
            return result
        }

        // Repeated START, followed by the read address.
        start()
        ok = writeByte((deviceAddress << 1) | 1)

        if (!ok) {
            stop()
            return result
        }

        for (let i = 0; i < count; i++) {
            result.push(readByte(i < count - 1))
        }

        stop()
        return result
    }

    function readRegisterInternal(register: number): number {
        const result = readRegistersInternal(register, 1)

        if (result.length != 1) {
            return -1
        }

        return result[0]
    }

    function signedWord(register: number): number {
        const bytes = readRegistersInternal(register, 2)

        if (bytes.length != 2) {
            return 0
        }

        let value = (bytes[0] << 8) | bytes[1]

        if (value >= 32768) {
            value -= 65536
        }

        return value
    }

    //% block="initialize MPU6050 SDA $sda SCL $scl address $address"
    //% sda.defl=DigitalPin.P1
    //% scl.defl=DigitalPin.P2
    //% address.defl=104
    //% address.min=104
    //% address.max=105
    //% weight=100
    //% subcategory="Setup"
    export function initialize(
        sda: DigitalPin,
        scl: DigitalPin,
        address: number
    ): boolean {
        initialized = false

        if (sda == scl) {
            return false
        }

        sdaPin = sda
        sclPin = scl

        if (address != 104 && address != 105) {
            return false
        }

        deviceAddress = address

        releaseSDA()
        releaseSCL()
        control.waitMicros(1000)

        // Check WHO_AM_I (register 0x75).
        if (readRegisterInternal(0x75) != 0x68) {
            return false
        }

        // Wake up the MPU6050.
        if (!writeRegisterInternal(0x6B, 0x00)) {
            return false
        }

        // Accelerometer full scale: +/- 2g.
        if (!writeRegisterInternal(0x1C, 0x00)) {
            return false
        }

        // Gyroscope full scale: +/- 250 degrees/second.
        if (!writeRegisterInternal(0x1B, 0x00)) {
            return false
        }

        // Sample-rate divider.
        if (!writeRegisterInternal(0x19, 0x04)) {
            return false
        }

        control.waitMicros(100000)
        initialized = true
        return true
    }

    //% block="MPU6050 connected"
    //% weight=95
    //% subcategory="Setup"
    export function isConnected(): boolean {
        return initialized &&
            readRegisterInternal(0x75) == 0x68
    }

    //% block="accelerometer X raw"
    //% weight=90
    //% subcategory="Accelerometer"
    export function accelerationX(): number {
        if (!initialized) return 0
        return signedWord(0x3B)
    }

    //% block="accelerometer Y raw"
    //% weight=89
    //% subcategory="Accelerometer"
    export function accelerationY(): number {
        if (!initialized) return 0
        return signedWord(0x3D)
    }

    //% block="accelerometer Z raw"
    //% weight=88
    //% subcategory="Accelerometer"
    export function accelerationZ(): number {
        if (!initialized) return 0
        return signedWord(0x3F)
    }

    //% block="gyroscope X raw"
    //% weight=80
    //% subcategory="Gyroscope"
    export function gyroscopeX(): number {
        if (!initialized) return 0
        return signedWord(0x43)
    }

    //% block="gyroscope Y raw"
    //% weight=79
    //% subcategory="Gyroscope"
    export function gyroscopeY(): number {
        if (!initialized) return 0
        return signedWord(0x45)
    }

    //% block="gyroscope Z raw"
    //% weight=78
    //% subcategory="Gyroscope"
    export function gyroscopeZ(): number {
        if (!initialized) return 0
        return signedWord(0x47)
    }

    //% block="accelerometer X in g"
    //% subcategory="Accelerometer"
    export function accelerationXg(): number {
        return accelerationX() / 16384
    }

    //% block="accelerometer Y in g"
    //% subcategory="Accelerometer"
    export function accelerationYg(): number {
        return accelerationY() / 16384
    }

    //% block="accelerometer Z in g"
    //% subcategory="Accelerometer"
    export function accelerationZg(): number {
        return accelerationZ() / 16384
    }

    //% block="gyroscope X in degrees per second"
    //% subcategory="Gyroscope"
    export function gyroscopeXdps(): number {
        return gyroscopeX() / 131
    }

    //% block="gyroscope Y in degrees per second"
    //% subcategory="Gyroscope"
    export function gyroscopeYdps(): number {
        return gyroscopeY() / 131
    }

    //% block="gyroscope Z in degrees per second"
    //% subcategory="Gyroscope"
    export function gyroscopeZdps(): number {
        return gyroscopeZ() / 131
    }
}
