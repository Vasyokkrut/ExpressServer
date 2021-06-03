# Backend part of MERN stack application

> powered by and written on express framework with mongoose

This is the backend part of fullstack mern application  
Once you've installed this server, you can find the frontend part [here](https://github.com/Vasyokkrut/ReactFrontend)

# Starting up
**note that for using this app you should have a running mongodb**

## for development

> you can change mongo url in .env file

#### install the dependencies and start the server
```
npm i
# optionally you can set NODE_ENV to development
npm run dev
```

note that this app is just a backend part of fullstack mern app  
you may find frontend part [here](https://github.com/Vasyokkrut/ReactFrontend)

## for production

#### first you should set up your NODE_ENV variable:
```
# for bash
export NODE_ENV=production

# for powershell
$env:NODE_ENV = 'production'

# for windows command prompt
set NODE_ENV=production
```

#### after that you should set up these six env variables:
- ACCESSSECRETKEY
- ACCESSTOKENLIFETIME
- REFRESHSECRETKEY
- REFRESHTOKENLIFETIME
- MONGOURL
- SERVERPORT

the default values you can see in .env file,  
but in your environment these variables can be different

**_don't use default values for jwt secret keys!_**  
just set them to a random long string

#### then you can install dependencies and start the server:
```
npm i
npm start
```

since this app is just a backend part of fullstack mern app  
you should build frontend part from [here](https://github.com/Vasyokkrut/ReactFrontend)  
and copy 'build' folder into the root of this app
