from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

app = Flask(__name__)
CORS(app)

# Mock user database
USERS = {
    'supervisor@example.com': {
        'id': 'sup001',
        'password': 'password123',
        'name': 'Supervisor User',
        'email': 'supervisor@example.com',
        'role': 'supervisor'
    },
    'employee@example.com': {
        'id': 'emp001',
        'password': 'password123',
        'name': 'Employee User',
        'email': 'employee@example.com',
        'role': 'employee'
    }
}

# Mock work logging database
WORK_LOGS = {
    'emp002': [
        {'date': '2025-11-03', 'hours': 9.5},
        {'date': '2025-11-04', 'hours': 10.2},
        {'date': '2025-11-05', 'hours': 9.8},
        {'date': '2025-11-06', 'hours': 11.0},
        {'date': '2025-11-07', 'hours': 8.5},
    ],
    'emp004': [
        {'date': '2025-11-03', 'hours': 10.5},
        {'date': '2025-11-04', 'hours': 11.0},
        {'date': '2025-11-05', 'hours': 10.8},
        {'date': '2025-11-06', 'hours': 12.0},
        {'date': '2025-11-07', 'hours': 9.5},
    ],
}

@app.route('/api/login', methods=['POST'])
def login():
    """Authenticate user and return user data"""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    user = USERS.get(email)
    
    if not user or user['password'] != password:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    return jsonify({
        'id': user['id'],
        'name': user['name'],
        'email': user['email'],
        'role': user['role']
    }), 200

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'Backend is running'}), 200

@app.route('/api/employees/<employee_id>/work-logs', methods=['GET'])
def get_work_logs(employee_id):
    """Get work logs for a specific employee"""
    logs = WORK_LOGS.get(employee_id, [])
    
    if not logs:
        return jsonify({'error': 'No work logs found for employee'}), 404
    
    days_map = {
        0: 'Monday',
        1: 'Tuesday',
        2: 'Wednesday',
        3: 'Thursday',
        4: 'Friday',
        5: 'Saturday',
        6: 'Sunday',
    }
    
    work_time_per_day = []
    for log in logs:
        date_obj = datetime.strptime(log['date'], '%Y-%m-%d')
        day_name = days_map[date_obj.weekday()]
        work_time_per_day.append({
            'day': day_name,
            'hours': log['hours']
        })
    
    return jsonify({'workTimePerDay': work_time_per_day}), 200

@app.route('/api/team/burnout-metrics', methods=['GET'])
def get_burnout_metrics():
    """Get team burnout metrics and analysis"""
    return jsonify({
        'teamStress': 6.3,
        'teamMorale': 6.8,
        'workLifeBalance': 4.5,
        'averageWellbeing': 6.4,
        'burnoutRiskLevel': 'Moderate',
        'atRiskCount': 2,
        'totalTeamMembers': 5,
    }), 200

@app.route('/api/team/recommendations', methods=['GET'])
def get_recommendations():
    """Get proactive recommendations based on team analytics"""
    return jsonify({
        'recommendations': [
            {
                'id': 1,
                'title': 'Workload Review',
                'description': 'Redistribute tasks from high-risk employees. David Wilson is averaging 10.9 hrs/day.',
                'priority': 'High',
                'category': 'Workload Management'
            },
            {
                'id': 2,
                'title': 'Check-in Meetings',
                'description': 'Schedule one-on-ones with Bob Smith and David Wilson to discuss challenges and support needs.',
                'priority': 'High',
                'category': 'Employee Support'
            },
            {
                'id': 3,
                'title': 'Enable Time Off',
                'description': 'Encourage break time and flex schedules for at-risk team members to prevent further burnout.',
                'priority': 'Medium',
                'category': 'Wellness Support'
            },
            {
                'id': 4,
                'title': 'Stress Management Program',
                'description': 'Introduce wellness programs, meditation sessions, or mental health resources for the team.',
                'priority': 'Medium',
                'category': 'Wellness Program'
            },
            {
                'id': 5,
                'title': 'Monitor Absenteeism',
                'description': 'Track absence patterns as they often correlate with burnout risks.',
                'priority': 'Low',
                'category': 'Monitoring'
            }
        ]
    }), 200

@app.route('/api/team/burnout-trends', methods=['GET'])
def get_burnout_trends():
    """Get burnout trends over time"""
    return jsonify({
        'trends': [
            {'week': 'Week 1', 'burnoutScore': 4.2, 'atRiskCount': 1},
            {'week': 'Week 2', 'burnoutScore': 4.5, 'atRiskCount': 1},
            {'week': 'Week 3', 'burnoutScore': 5.1, 'atRiskCount': 2},
            {'week': 'Week 4', 'burnoutScore': 5.8, 'atRiskCount': 2},
        ]
    }), 200

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    app.run(debug=True, port=port, host='0.0.0.0')

