@echo off

IF NOT EXIST %AppData%\ZiCE (
    mkdir %AppData%\ZiCE
)

IF NOT EXIST %AppData%\ZiCEio (
    mkdir %AppData%\ZiCEio
)

IF NOT EXIST %AppData%\ZcashParams (
    mkdir %AppData%\ZcashParams
)

IF NOT EXIST %AppData%\ZiCE\zice.conf (
   (
    echo rpcallowip=127.0.0.1
    echo txindex=1
    echo server=1
) > %AppData%\ZiCE\zice.conf
) 
