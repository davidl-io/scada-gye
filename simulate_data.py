import paho.mqtt.client as mqtt
import time
import json
import random

BROKER = "broker.hivemq.com"
PORT = 1883

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, "scada_simulator_123")
client.connect(BROKER, PORT)
client.loop_start()

devices = ["controlador-ils", "controlador-glide"]

print(f"Connected to {BROKER}. Simulating data...")
print("Press Ctrl+C to stop.")

try:
    while True:
        for device_id in devices:
            topic = f"v3/tagsa/devices/{device_id}/up"
            
            # Simulate randomly losing grid power, but keeping generator, or losing both.
            # 80% chance both are true
            # 10% chance grid is lost, generator is true
            # 10% chance both are false
            rand = random.random()
            if rand < 0.8:
                di1 = True
                di2 = True
            elif rand < 0.9:
                di1 = False
                di2 = True
            else:
                di1 = False
                di2 = False
                
            payload = {
                "end_device_ids": {
                    "device_id": device_id
                },
                "uplink_message": {
                    "decoded_payload": {
                        "DI1_Activo": di1,
                        "DI2_Activo": di2
                    }
                },
                "received_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
            
            client.publish(topic, json.dumps(payload))
            print(f"Sent to {device_id} -> Grid: {di1}, Load: {di2}")
            
        time.sleep(5) # Send data every 5 seconds
except KeyboardInterrupt:
    print("\nStopping simulator...")
finally:
    client.loop_stop()
    client.disconnect()
