const User = require("../models/user");
const Doctor = require("../models/doctor");
const Patient = require("../models/patient");
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const isUserValid = (newUser) => {
    const errorList = [];
    const nameRegex = /^[a-zA-Z]+(([',. -][a-zA-Z ])?[a-zA-Z]*)*$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

    if (!newUser.firstName) {
        errorList.push('Please enter first name');
    } else if (!nameRegex.test(newUser.firstName)) {
        errorList.push('First name is invalid');
    }
    if (!newUser.lastName) {
        errorList.push('Please enter last name');
    } else if (!nameRegex.test(newUser.lastName)) {
        errorList.push('Last name is invalid');
    }

    if (!newUser.email) {
        errorList.push("Please enter email");
    } else if (!emailRegex.test(newUser.email)) {
        errorList.push("Invalid email format");
    }

    if (!newUser.password) {
        errorList.push("Please enter password");
    }

    if (!newUser.confirmPassword) {
        errorList.push("Please re-enter password in Confirm Password field");
    }

    if (!newUser.userType) {
        errorList.push("Please enter User Type");
    }

    if (newUser.password !== newUser.confirmPassword) {
        errorList.push("Password and Confirm Password did not match");
    }

    if (errorList.length > 0) {
        return { status: false, errors: errorList };
    } else {
        return { status: true };
    }
};

const saveVerificationToken = async (userId, verificationToken) => {
    await User.findOneAndUpdate({ _id: userId }, { "verificationToken": verificationToken });
    return;
}

const generateVerificationToken = () => {
    const token = crypto.randomBytes(64).toString('hex');
    const expires = Date.now() + 3 * 60 * 60 * 1000; // 3 hours from now
    let verificationToken = {
        "token": token,
        "expires": expires
    };
    return verificationToken;
};

const signUp = (req, res) => {
    const newUser = req.body;

    const userValidStatus = isUserValid(newUser);
    if (!userValidStatus.status) {
        res.json({ message: "error", errors: userValidStatus.errors });
    } else {
        console.log(newUser)
        User.create(
            {
                email: newUser.email,
                username: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                password: newUser.password,
                userType: newUser.userType,
                location: newUser.location
            },
            (error, userDetails) => {
                if (error) {
                    res.json({ message: "error", errors: [error.message] });
                } else {
                    let verificationToken = generateVerificationToken()
                    saveVerificationToken(userDetails._id, verificationToken);

                    if (newUser.userType === "Doctor") {
                        Doctor.create(
                            {
                                userId: userDetails._id,
                                firstName: newUser.firstName,
                                lastName: newUser.lastName,
                                email: newUser.email,
                                username: newUser.email
                            },
                            (error2, doctorDetails) => {
                                if (error2) {
                                    User.deleteOne({ _id: userDetails });
                                    res.json({ message: "error", errors: [error2.message] });
                                } else {
                                    res.json({ message: "success" });
                                }
                            }
                        );
                    }
                    if (newUser.userType === "Patient") {
                        Patient.create(
                            {
                                userId: userDetails._id,
                                firstName: newUser.firstName,
                                lastName: newUser.lastName,
                                email: newUser.email,
                                username: newUser.email
                            },
                            (error2, patientDetails) => {
                                if (error2) {
                                    User.deleteOne({ _id: userDetails });
                                    res.json({ message: "error", errors: [error2.message] });
                                } else {
                                    res.json({ message: "success" });
                                }
                            }
                        );
                    }
                }
            }
        );
    }
};

const verifyUser = (req, res) => {
    const token = req.params.id;
    const verifyEmail = async (token) => {
        const user = await User.findOneAndUpdate({
            'verificationToken.token': token,
            'verificationToken.expires': { $gt: Date.now() }
        }, {
            "activated": true,
            "verificationToken.token": null
        });

        if (!user) {
            console.log("Email could not be verified");
            res.status(500).json({ message: 'Error verifying account' });
        }
        else {
            console.log("Email verified");
            res.send("Email verified");
        }
    };
    verifyEmail(token);
}

module.exports = {
    signUp,
    verifyUser
}
