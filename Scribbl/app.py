from flask import Flask, render_template, send_from_directory
import os

app = Flask(__name__)

# Serve all main pages
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/notes')
def notes():
    return render_template('notes.html')

@app.route('/progress')
def progress():
    return render_template('progress.html')

@app.route('/history')
def history():
    return render_template('history.html')

@app.route('/settings')
def settings():
    return render_template('settings.html')

@app.route('/secure-notes')
def secure_notes():
    return render_template('secure-notes.html')

# Redirect .html extensions to clean URLs
@app.route('/<page>.html')
def redirect_old_links(page):
    valid_pages = ['dashboard', 'notes', 'progress', 'history', 'settings', 'secure-notes', 'index']
    if page in valid_pages:
        if page == 'index':
            return '<script>window.location.href = "/"</script>'
        else:
            return f'<script>window.location.href = "/{page}"</script>'
    else:
        return "Page not found", 404

# Serve static files
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

@app.route('/static/css/<path:filename>')
def serve_css(filename):
    return send_from_directory('static/css', filename)

@app.route('/static/js/<path:filename>')
def serve_js(filename):
    return send_from_directory('static/js', filename)

@app.route('/static/images/<path:filename>')
def serve_images(filename):
    return send_from_directory('static/images', filename)

@app.route('/static/fonts/<path:filename>')
def serve_fonts(filename):
    return send_from_directory('static/fonts', filename)

# Handle 404 errors
@app.errorhandler(404)
def not_found(error):
    return "Page not found", 404

if __name__ == '__main__':
    # Run on all network interfaces
    app.run(debug=True, host='0.0.0.0', port=5000)