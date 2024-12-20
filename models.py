from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    is_admin = db.Column(db.Boolean, default=False)
    trial_end_date = db.Column(db.DateTime)
    registration_date = db.Column(db.DateTime, default=datetime.utcnow)
    trial_days = db.Column(db.Integer, default=7)  # Default trial period of 7 days
    is_active = db.Column(db.Boolean, default=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def set_trial_period(self, days):
        self.trial_days = days
        self.trial_end_date = datetime.utcnow() + timedelta(days=days)

    def is_trial_expired(self):
        if self.is_admin:
            return False
        if not self.trial_end_date:
            return True
        return datetime.utcnow() > self.trial_end_date

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'is_admin': self.is_admin,
            'trial_end_date': self.trial_end_date.strftime('%Y-%m-%d %H:%M:%S') if self.trial_end_date else None,
            'registration_date': self.registration_date.strftime('%Y-%m-%d %H:%M:%S'),
            'trial_days': self.trial_days,
            'is_active': self.is_active,
            'trial_status': 'Active' if not self.is_trial_expired() else 'Expired'
        }
