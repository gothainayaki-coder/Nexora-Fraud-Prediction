// FILE: models/CyberCrime.js
// Authoritative Cyber Crimes Database Schema
// Maps directly to real-world threat vectors and investigative protocols

const mongoose = require('mongoose');

const CyberCrimeSchema = new mongoose.Schema({
    crimeCode: {
        type: String,
        required: true,
        unique: true,
        index: true,
        description: 'Universal Cyber Crime Identification Code (e.g., CC-PH-001)'
    },
    crimeType: {
        type: String,
        required: true,
        enum: {
            values: [
                'Phishing',
                'Vishing',
                'Smishing',
                'Ransomware',
                'Identity Theft',
                'Financial Fraud',
                'Social Engineering',
                'Data Breach',
                'UPI Fraud',
                'Investment Scam',
                'Tech Support Fraud',
                'Cyber Stalking',
                'Hate Speech',
                'Malware Distribution'
            ],
            message: 'Invalid crime type classification'
        }
    },
    threatVector: {
        origin: { type: String, required: true, description: 'Source of the threat (e.g., SMS, Email, IP Address)' },
        methodology: { type: String, required: true, description: 'The "Cyber Working" flow or MO' },
        severityIndex: { type: Number, min: 1, max: 10, required: true }
    },
    investigativeProtocol: {
        standardProcedure: [{ type: String }],
        evidenceRequired: [{ type: String }],
        legalStatutes: [{ type: String, description: 'Relevant legal sections/laws' }]
    },
    technicalMetadata: {
        patterns: [{ type: String, description: 'Regex/Regex-like patterns for detection' }],
        vulnerabilityTargeted: { type: String },
        entropyScore: { type: Number }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for lookup by type and severity
CyberCrimeSchema.index({ crimeType: 1, 'threatVector.severityIndex': -1 });

CyberCrimeSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('CyberCrime', CyberCrimeSchema);
