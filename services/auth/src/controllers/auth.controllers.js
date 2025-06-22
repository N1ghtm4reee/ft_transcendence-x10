import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient();

const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.VERIFICATION_EMAIL,
        pass: process.env.VERIFICATION_EMAIL_PASS 
    },
});

async function sendEmail(emailoptions) {
    try {
        await transporter.sendMail(emailoptions)
        return console.log(`Message sent to ${emailoptions.to}`);
    } catch (err) {
        return console.error('Error sending email:', err);
    }
}


async function createNewProfile(userData) {
    
    const userProfile = {
        id: userData.id,
        displayName: userData.name,
        avatar: userData.avatar || '/default-avatar.png',
        bio: 'hey there! want to play a game?',
    }
    
    // should be internal service call
    const profileResponse = await fetch('http://user-service:3002/api/user-management/profiles', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...userProfile})
    });
    
    if (!profileResponse.ok) {
       throw new Error('Failed to create user profile');    
    }
}

async function createNewUser(user, res) {
    try {
        const existingUser = await prisma.user.findUnique({
            where: {email: user.email}
        });

        if (existingUser) {
            return res.status(400).send({
                error: 'User already exists, please login instead.'
            });
        }

        const newUser = await prisma.user.create({
            data: {
                email: user.email,
                passwordHash: user.password || '',
                name: user.name || user.email.split('@')[0],
                oauthProvider: (user.password) ? 'local' : 'google',
                isVerified: true
            }
        });

        return newUser;
        
    } catch (err) {
        console.error('Error creating new user:', err);
        throw new Error('Failed to create user');
    }
}


export async function signupSendCode(req, res) {
    const {email, password, name} = req.body;
    
    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    const token = jwt.sign({email, name, password, verificationCode}, 
                            process.env.JWT_SECRET,
                            {expiresIn: '10m'});
    console.log('jwt token:', token);
    console.log('verification code:', verificationCode);

    const emailoptions = {
        from: process.env.VERIFICATION_EMAIL,
        to: email,
        subject: 'Verification Code',
        text: `Your verification code is ${verificationCode}`,
    }

    sendEmail(emailoptions)

    return res.send({check: true, token: token, message: 'Verification code sent to your email.'});
}

export async function signupVerifyCode(req, res) {
    const {token, code} = req.body;
    let user;
    try {
        user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return res.status(400).send({error: 'Invalid/Expired token'});
    }

    if (user.verificationCode !== code) {
        return res.status(400).send({error: 'Invalid verification code'});
    }

    try {
        const newUser = await createNewUser(user, res);

        try {
            await createNewProfile(newUser);
        } catch (err) {
            console.error('Error calling user service', err);
        }

        const authToken = jwt.sign({
            userId: newUser.id,
            email: newUser.email,
            name: newUser.name,
            authProvider: newUser.oauthProvider
        }, process.env.JWT_SECRET, { expiresIn: '7d'});

        return res.status(201).send({
            message: 'User created successfully',
            token: authToken
        });
        
    } catch (err) {
        console.error('Error creating user:', err);
        return res.status(500).send({error: 'Failed to create user'});
    }
}

export async function signupGoogleCallback(req, res) {
    let jwtToken;
    try  {
        const {token} = await this.google.getAccessTokenFromAuthorizationCodeFlow(req);
        const result = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', 
                                { headers: { Authorization: `Bearer ${token.access_token}` } });
        if (!result.ok) {
            console.error('Failed to fetch user data from Google:', result.statusText);
            return res.status(500).send({error: 'Failed to fetch user data from Google'});
        }
        const userData = await result.json();
        const newUser = await createNewUser(userData, res);
        newUser.avatar = userData.picture;
        jwtToken = jwt.sign({
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            authProvider: newUser.oauthProvider
        }, process.env.JWT_SECRET, { expiresIn: '7d'});


        await createNewProfile(newUser);

    } catch (err) {
        console.error('Error in Google OAuth callback:', err);
        return res.status(500).send({error: 'Internal server error'});
    }

    return res.status(201).send({
        message: 'Google OAuth successful',
        token: jwtToken
    });
}

export async function verifyToken(req, res) {
    const {token} = req.body;

    if (!token) {
        return res.status(400).send({error: 'Token is required'});
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: {id: decoded.userId},
            select : { id: true }
        });

        if (!user) {
            return res.status(404).send({error: 'User not found'});
        }

        return res.send({
            userId: user.id,
            // email: user.email,
            // name: user.name,
            // isVerified: user.isVerified
        });
    } catch (err) {
        console.error('Error verifying token:', err);
        return res.status(401).send({error: 'Invalid/Expired token'});
    }
}

export const authControllers = {
    signupSendCode,
    signupVerifyCode,
    signupGoogleCallback,
    verifyToken
};