import type{ Request,Response,NextFunction } from "express";



const error404  = ( _req:Request,res:Response,next:NextFunction) =>  {

    res.status(404).json({
        code : 404,
        success : false,
        message : "Sorry, this resource does not exist on the server!"

    })


    next()

}



export  default error404