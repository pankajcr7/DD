import os

# Create necessary directories
dirs = ['templates', 'static']
base_path = os.path.dirname(os.path.abspath(__file__))

for dir_name in dirs:
    dir_path = os.path.join(base_path, dir_name)
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)
