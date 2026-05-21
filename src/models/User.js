import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        // `select: false` so the hash never accidentally leaks via populate/find.
        password: { type: String, required: true, minlength: 8, select: false },
        role: { type: String, enum: ['admin', 'editor'], default: 'admin' },
        lastLoginAt: { type: Date },
        // Bump this on logout-everywhere / password change to invalidate all
        // outstanding refresh tokens for the user.
        tokenVersion: { type: Number, default: 0 },
    },
    { timestamps: true }
)

userSchema.pre('save', async function hashPassword(next) {
    if (!this.isModified('password')) return next()
    this.password = await bcrypt.hash(this.password, 12)
    next()
})

userSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password)
}

userSchema.methods.toSafeJSON = function () {
    const obj = this.toObject()
    delete obj.password
    return obj
}

export const User = mongoose.model('User', userSchema)
