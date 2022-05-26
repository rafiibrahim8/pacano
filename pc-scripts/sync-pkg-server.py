#!/usr/bin/python
import requests
import subprocess

## Add repos {name: use_mirror} that will be sync here
REPOS = {
    'core': 'official', 
    'extra': 'official', 
    'community': 'official', 
    'multilib': 'official', 
    'chaotic-aur': 'chaotic'
}
## Add Server url
URL = 'http://127.0.0.1:8000'
## Add Admin Token
ADMIN_TOKEN = '727ff0536ee4010ab0527de3537fbd09e1459f254cbb77980714d27c3a31cc32'


header = {'Authorization': f'Bearer {ADMIN_TOKEN}'}
def assert_paclist():
    try:
        subprocess.check_output('paclist --help'.split())
    except:
        print('Please install `pacman-contrib` package.')
        exit(1)
 
def create_json():
    jdata = list()
    for i in REPOS:
        op = subprocess.check_output(['paclist', i]).decode('utf-8')
        op = [i.strip() for i in op.split('\n') if i.strip()]
        op = map(lambda x: x.split()[0], op)
        for j in op:
            jdata.append({'name': j, 'repo': i})
    return jdata

def sendPackages():
    res = requests.post(f'{URL}/package', json=create_json(), headers=header)
    print(res.status_code, res.json()['msg'])

def sendRepos():
    for k,v in REPOS.items():
        jdata = {'name': k, 'mirror': v}
        res = requests.post(f'{URL}/repo', json=jdata, headers=header)
        print(res.status_code, res.json()['msg'])

def main():
    sendRepos()
    sendPackages()

if __name__ == '__main__':
    main()
