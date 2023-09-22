from flask import Flask

app = Flask(__name__, static_url_path='', static_folder='')

@app.route('/')
def index():
    return app.redirect('index.html')

if __name__ == '__main__':
    app.run('0.0.0.0', 8888, debug=True)