
/**
 * MPU6050 Software I2C Extension
 * micro:bit V2
 *
 * SDA: P1 (ring)
 * SCL: P2 (ring)
 * VCC: 3V
 * GND: GND
 *
 * MPU6050 address: 0x68 (AD0 low) or 0x69 (AD0 high)
 * Accelerometer range: +/- 2g
 * Gyroscope range: +/- 250 degrees/second
 */

namespace mpu6050soft {
    let sdaPin: DigitalPin = DigitalPin.P1
    let sclPin: DigitalPin = DigitalPin.P2
    let deviceAddress = 0x68
    let initialized = false
    let lastReadOK = false

    function releaseLine(pin: DigitalPin): void {
        pins.setPull(pin, PinPullMode.PullNone)
        pins.digitalReadPin(pin)
    }

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

        // Release SDA so the sensor can ACK.
        releaseSDA()
        control.waitMicros(5)
        clockHigh()

        const acknowledged = pins.digitalReadPin(sdaPin) == 0

        clockLow()
        releaseSDA()
        return acknowledged
    }

    function readByte(acknowledge: boolean): number {
        let value = 0
        releaseSDA()

        for (let i = 0; i < 8; i++) {
            value = value * 2

            clockHigh()
            if (pins.digitalReadPin(sdaPin) != 0) {
                value += 1
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

        // Repeated START followed by read address.
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

    function signedValue(highByte: number, lowByte: number): number {
        let value = highByte * 256 + lowByte

        if (value >= 32768) {
            value -= 65536
        }

        return value
    }

    // Read all 14 bytes in one transaction:
    // accelerometer (6), temperature (2), gyroscope (6).
    function readSampleInternal(): number[] {
        const bytes = readRegistersInternal(0x3B, 14)

        if (bytes.length != 14) {
            lastReadOK = false
            return []
        }

        const ax = signedValue(bytes[0], bytes[1])
        const ay = signedValue(bytes[2], bytes[3])
        const az = signedValue(bytes[4], bytes[5])

        const temperature = signedValue(bytes[6], bytes[7])

        const gx = signedValue(bytes[8], bytes[9])
        const gy = signedValue(bytes[10], bytes[11])
        const gz = signedValue(bytes[12], bytes[13])

        lastReadOK = true

        return [ax, ay, az, gx, gy, gz, temperature]
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
        lastReadOK = false

        if (sda == scl) {
            return false
        }

        if (address != 104 && address != 105) {
            return false
        }

        sdaPin = sda
        sclPin = scl
        deviceAddress = address

        releaseSDA()
        releaseSCL()
        control.waitMicros(1000)

        // WHO_AM_I should return 0x68.
        if (readRegisterInternal(0x75) != 0x68) {
            return false
        }

        // Wake up the MPU6050.
        if (!writeRegisterInternal(0x6B, 0x00)) {
            return false
        }

        // Accelerometer +/- 2g.
        if (!writeRegisterInternal(0x1C, 0x00)) {
            return false
        }

        // Gyroscope +/- 250 degrees/second.
        if (!writeRegisterInternal(0x1B, 0x00)) {
            return false
        }

        // Sample rate divider.
        if (!writeRegisterInternal(0x19, 0x04)) {
            return false
        }

        // Digital low-pass filter setting.
        if (!writeRegisterInternal(0x1A, 0x03)) {
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

    //% block="last MPU6050 sample read OK"
    //% subcategory="Setup"
    export function lastSampleOK(): boolean {
        return lastReadOK
    }

    //% block="read MPU6050 sample"
    //% subcategory="Setup"
    export function readAll(): number[] {
        if (!initialized) {
            lastReadOK = false
            return []
        }

        return readSampleInternal()
    }

    //% block="accelerometer X raw"
    //% weight=90
    //% subcategory="Accelerometer"
    export function accelerationX(): number {
        const sample = readAll()
        return sample.length == 7 ? sample[0] : 0
    }

    //% block="accelerometer Y raw"
    //% weight=89
    //% subcategory="Accelerometer"
    export function accelerationY(): number {
        const sample = readAll()
        return sample.length == 7 ? sample[1] : 0
    }

    //% block="accelerometer Z raw"
    //% weight=88
    //% subcategory="Accelerometer"
    export function accelerationZ(): number {
        const sample = readAll()
        return sample.length == 7 ? sample[2] : 0
    }

    //% block="gyroscope X raw"
    //% weight=80
    //% subcategory="Gyroscope"
    export function gyroscopeX(): number {
        const sample = readAll()
        return sample.length == 7 ? sample[3] : 0
    }

    //% block="gyroscope Y raw"
    //% weight=79
    //% subcategory="Gyroscope"
    export function gyroscopeY(): number {
        const sample = readAll()
        return sample.length == 7 ? sample[4] : 0
    }

    //% block="gyroscope Z raw"
    //% weight=78
    //% subcategory="Gyroscope"
    export function gyroscopeZ(): number {
        const sample = readAll()
        return sample.length == 7 ? sample[5] : 0
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
