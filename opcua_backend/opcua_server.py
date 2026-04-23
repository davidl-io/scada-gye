import asyncio
import logging
from asyncua import Server, ua

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("opcua_backend")

async def main():
    server = Server()
    await server.init()
    
    # Configurar el endpoint para el servidor OPC UA
    server.set_endpoint("opc.tcp://0.0.0.0:4840/freeopcua/server/")
    server.set_server_name("SCADA PLC OPC UA Server")
    
    # Registrar el namespace
    uri = "http://tagsa.aeropuerto.scada"
    idx = await server.register_namespace(uri)
    
    # Crear un objeto raíz para los futuros PLCs
    plcs_node = await server.nodes.objects.add_object(idx, "PLCs")
    
    # Crear la estructura base para el PLC LOGO y S7-1200 como preconfiguración
    s7_node = await plcs_node.add_object(idx, "S7-1200")
    s7_status = await s7_node.add_variable(idx, "ConnectionStatus", True)
    await s7_status.set_writable()

    logo_node = await plcs_node.add_object(idx, "LOGO")
    logo_status = await logo_node.add_variable(idx, "ConnectionStatus", True)
    await logo_status.set_writable()

    logger.info("================================================")
    logger.info(" OPC UA Server Módulo Aislado Preparado ")
    logger.info(" Esperando conexiones en opc.tcp://localhost:4840/freeopcua/server/")
    logger.info(" Listo para Integración Futura con PLCs LOGO / S7-1200")
    logger.info("================================================")
    
    # Mantener el servidor vivo de manera aislada
    async with server:
        while True:
            await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(main())
