# BLE Serial Protocol Specification

**Application:** PowerMon - Real-time Power Monitor for Atorch Power Meters  
**Supported Devices:** Atorch UD18, UD24, DT24, and similar USB/S1-B mains power meters  
**Protocol Type:** BLE UART Serial over FFE0/FFE2/FFE1  
**Last Updated:** March 19, 2026

---

## Overview

The Atorch power meters communicate via BLE using a serial protocol. This document details:
- Command structure for controlling devices
- Data packet format received from devices
- Bit-by-bit breakdown of measurement data
- Device-specific differences (UD18/UD24 vs S1-B)

---

## Commands for UD18 / UD24

### Reset Commands

| Command | Bytes | Description |
|---------|-------|-------------|
| WH Reset | `FF 55 11 03 01 00 00 00 00 51` | Reset Watt-hour counter |
| AH Reset | `FF 55 11 03 02 00 00 00 00 52` | Reset Amp-hour counter |
| TIME Reset | `FF 55 11 03 03 00 00 00 00 53` | Reset time counter |
| ALL Reset | `FF 55 11 03 05 00 00 00 00 5d` | Reset all counters |

### Control Commands (Button Simulation)

| Command | Bytes | Description |
|---------|-------|-------------|
| SETUP Button | `FF 55 11 03 31 00 00 00 00 01` | Enter setup mode |
| ENTER Button | `FF 55 11 03 32 00 00 00 00 02` | Confirm selection |
| [+] Button | `FF 55 11 03 33 00 00 00 00 03` | Increment value |
| [-] Button | `FF 55 11 03 34 00 00 00 00 0C` | Decrement value |

---

## Commands for S1-B

### Control Commands

| Command | Bytes | Description |
|---------|-------|-------------|
| WH Reset | `FF 55 11 03 01 00 00 00 00 51` | Reset Watt-hour counter |
| Internal Relay | `FF 55 11 03 02 00 00 00 00 52` | Toggle internal relay (load control) |
| TIME Reset | `FF 55 11 03 03 00 00 00 00 53` | Reset time counter |

---

## Data Packet Structure

### General Format

All data packets are **36 bytes** (72 hex ASCII characters):

```
FF 55 [msg_type] [device_type] [measurement_data...] [CRC]
```

**Header Format:**
- **Byte 00:** `FF` - Start marker
- **Byte 01:** `55` - Protocol identifier
- **Byte 02:** Message type (0x01 = data, 0x11 = command, 0x02 = ACK)
- **Byte 03:** Device type (0x03 = USB device like UD18/UD24, 0x01 = Mains device like S1-B)

---

## Data Packet Field Mappings

### UD18 / UD24 (USB Power Meter)

| Bit | Field | Type | Scaling | Notes |
|-----|-------|------|---------|-------|
| 00 | Start | - | - | Always `FF` |
| 01 | Protocol | - | - | Always `55` |
| 02 | Message Type | - | - | 0x01 for data |
| 03 | Device Type | - | - | 0x03 for USB |
| **04-06** | **Voltage (V)** | INT24 | /100 | Example: 0x043A6 = 23970 → 239.70V |
| **07-09** | **Current (I)** | INT24 | /1000 | Example: 0x000C35 = 3125 → 3.125A |
| **0A-0C** | **Power (W)** | INT24 | /1 | Example: 0x01D4C4 = 119748 → 119.748W |
| **0D-10** | **Energy (Wh)** | INT32 | /100 | Cumulative Wh since last reset |
| **11-12** | **Discount (D-)** | INT16 | /100 | Historical? Purpose unclear |
| **13-14** | **Discount+ (D+)** | INT16 | /100 | Historical? Purpose unclear |
| 16 | **Temperature** | BYTE | °C | Ambient/device temperature |
| 18 | **Hour** | BYTE | 0-23 | Runtime hour counter |
| 19 | **Minute** | BYTE | 0-59 | Runtime minute counter |
| 1A | **Second** | BYTE | 0-59 | Runtime second counter |
| 23 | **CRC** | BYTE | - | Checksum (algorithm unknown) |

**Example UD24 Packet (partial):**
```
FF 55 01 03 10 46 01 15 01 00 52 0C A8 03 00 00 ...
                └─ V (262.2V)
                    └─ I (3.125A)
                        └─ W (119.748W)
```

---

### S1-B (Mains Power Meter)

| Bit | Field | Type | Scaling | Notes |
|-----|-------|------|---------|-------|
| 00 | Start | - | - | Always `FF` |
| 01 | Protocol | - | - | Always `55` |
| 02 | Message Type | - | - | 0x01 for data |
| 03 | Device Type | - | - | 0x01 for Mains |
| **04-06** | **Voltage (V)** | INT24 | /10 | Different scale than UD24! |
| **07-09** | **Current (I)** | INT24 | /10 | Different scale than UD24! |
| **0A-0C** | **Power (W)** | INT24 | /10 | Different scale than UD24! |
| **0D-10** | **Energy (kWh)** | INT32 | /100 | Cumulative kWh (larger scale) |
| 11 | **Price** | BYTE | - | Price per kWh (integer) |
| **12-14** | **Price** | INT24 | /100 | Decimal price information |
| **14-15** | **Frequency** | INT16 | /10 | Mains frequency (Hz) |
| 16 | **Power Factor** | BYTE | - | PF integer part |
| **17-18** | **Power Factor** | INT16 | /1000 | Full power factor (0.000-1.000) |
| 19 | **Temperature** | BYTE | °C | Device temperature |
| **1A-1B** | **Hours** | INT16 | - | Runtime hours |
| 1C | **Minutes** | BYTE | 0-59 | Runtime minutes |
| 1D | **Seconds** | BYTE | 0-59 | Runtime seconds |

**Key Differences from UD24:**
- Voltage scaled by 10 instead of 100
- Current scaled by 10 instead of 1000
- Energy in kWh instead of Wh
- Includes price tracking
- Includes frequency (mains)
- Includes power factor
- Runtime in hours+minutes+seconds instead of hour+minute+second

---

## Protocol Details

### Integer Types

- **INT16:** 2 bytes, little-endian
- **INT24:** 3 bytes, little-endian
- **INT32:** 4 bytes, little-endian
- **BYTE:** 1 byte unsigned

### Example Parsing (UD24)

**Raw hex data from device:**
```
FF550103104601150100520CA80300000E4E000000FF0000000000000000000000FA
```

**Breakdown:**
```
FF    → Start marker
55    → Protocol ID
01    → Message type (data)
03    → Device type (USB)
10 46 01    → Voltage: 0x014610 = 84496 → 844.96V (ERROR - looks wrong)
15 01 00    → Current: 0x000115 = 277 → 0.277A
52 0C A8    → Power: 0x0CA852 = 835666 → 8356.66W (also wrong)
03 00 00 0E 4E 00 00 00 → Energy and other fields
...
FA    → CRC/Checksum
```

---

## Implementation Notes

### Packet Reception

1. **Buffer accumulation:** Concatenate all received hex data
2. **Length validation:** Wait for exactly 72 hex characters (36 bytes)
3. **Start marker:** Verify first 2 characters are "FF"
4. **Processing:** Parse fields according to device type
5. **CRC:** Validate checksum (algorithm TBD)

### Sending Commands

1. Convert command bytes to hex ASCII
2. Send via BLE UART (characteristic FFE2 for UD24/S1-B)
3. Device may respond with ACK (message type 0x02)
4. Allow time for device to process (100-200ms)

### Known Issues

- **CRC algorithm unknown:** Currently not validated
- **Discount fields (D-/D+):** Purpose unclear in UD24
- **Scaling inconsistency:** S1-B uses different scales than UD24 (requires manual conversion)

---

## Device Auto-Streaming

- **UD24 & S1-B:** Automatically send data packets every 1-2 seconds after BLE connection
- **No initialization command required:** Data flow begins immediately upon connection
- **No disconnect command:** Safe to disconnect anytime

---

## References

- **Protocol Version:** Based on reverse engineering from real hardware
- **Devices:** Atorch UD18, UD24, DT24, S1-B
- **GitHub:** https://github.com/lixas/Droidscript-AtorchMonitor

---

## Application Permissions

This application requires:
- **Storage:** To save configuration files
- **Location:** To access BLE devices (Android 6.0+)

---

**Last Updated:** March 19, 2026  
**Maintained By:** PowerMon Development Team
