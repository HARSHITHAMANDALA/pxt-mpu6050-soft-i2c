
# MPU6050 Soft I2C for micro:bit V2

A MakeCode extension for reading MPU6050 accelerometer
and gyroscope data through software I2C on GPIO ring pins.

## Features

- Software I2C communication
- Selectable SDA and SCL pins
- Raw accelerometer X, Y and Z readings
- Raw gyroscope X, Y and Z readings
- Accelerometer values in g
- Gyroscope values in degrees per second

## Wiring

MPU6050       micro:bit V2

VCC           3V (for a compatible breakout board)
GND           GND
SDA           P1
SCL           P2

Use P0, P1 or P2 as suitable GPIO pins.
Do not use P19 and P20 for this software I2C connection.

Ensure appropriate I2C pull-up resistors are present.
Check the breakout board voltage requirements before connecting.

## Example

```typescript
mpu6050soft.initialize(DigitalPin.P1, DigitalPin.P2)

basic.forever(function () {
    serial.writeLine(
        "AX:" + mpu6050soft.accelerationX() +
        ",AY:" + mpu6050soft.accelerationY() +
        ",AZ:" + mpu6050soft.accelerationZ() +
        ",GX:" + mpu6050soft.gyroscopeX() +
        ",GY:" + mpu6050soft.gyroscopeY() +
        ",GZ:" + mpu6050soft.gyroscopeZ()
    )
    basic.pause(100)
})
```

## Units

Accelerometer raw values use the +/-2g range.
Gyroscope raw values use the +/-250 degrees/second range.

Converted readings are available through the corresponding
blocks in the extension.

## License

MIT
```

---

## 4. Save all three files to GitHub

1. Open your repository: [pxt-mpu6050-soft-i2c](https://github.com/HARSHITHAMANDALA/pxt-mpu6050-soft-i2c).
2. Click **Add file → Create new file**.
3. Create `pxt.json` and paste the code from Step 1.
4. Repeat for `main.ts` and `README.md`.
5. Click **Commit changes** for each file.

All three files must be in the root directory, not inside a subfolder.

## 5. Load your extension into MakeCode

1. Open your micro:bit MakeCode project.
2. Click **Extensions**.
3. Enter this repository URL in the search field:

   `https://github.com/HARSHITHAMANDALA/pxt-mpu6050-soft-i2c`

4. Select the `mpu6050-soft-i2c` result.
5. Return to your project. You should see an **MPU6050 Soft I2C** category containing the blocks.

## 6. Test the extension

After adding the extension, switch to JavaScript and try this test program:

<CodeBlock language="typescript" editable>
mpu6050soft.initialize(DigitalPin.P1, DigitalPin.P2)

basic.forever(function () {
    basic.showNumber(mpu6050soft.accelerationX())
    basic.pause(500)
    basic.showNumber(mpu6050soft.gyroscopeX())
    basic.pause(500)
})
