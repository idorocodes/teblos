
import type { Request,Response } from "express"

const healthStatus = (req:Request,res:Response) =>{
    res.status(200).json({
        code : 200,
        sucess : true ,
        message : "Server working well !"
    })
}


export  default healthStatus