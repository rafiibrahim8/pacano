[![License][License-shield]][License-url]

# pacano
Tiny local Pacman mirror

# DESCRIPTION
pacano (pacman+nano) is a mirroring tool for Arch Linux repositories. But instead of mirroring the whole repository, pacano selectively mirrors packages which user is required. Thus saving a lot of storage space and bandwidth.

# GETTING STARTED
## Configuring Server
1. Install NodeJS (>=16.0.0)
2. Install `bsdtar` command 
3. Clone the repo
    ```
    git clone https://github.com/rafiibrahim8/pacano.git && cd pacano
    ```
4. Create a `.env` file add add your configurations (see `.env.example` and [Environment Variables](#environment-variables))
5. Run `npm install`
6. Run `npm start`

Repositories should be mirrored in `MIRRORDIR` directory of your environment variable. Server a static server from the directory (e.g.: [Using nginx](https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/)).

## Configuring User PC

After getting url from setting setting static file server above follow the steps below.

1. Edit `pc-scripts/sync-pkg-server.py` according to your configarations.
2. Run the following commands
    ```bash
    cp pc-scripts/sync-pkg-server.py ~/.local/bin/sync-pkg-server
    chmod +x ~/.local/bin/sync-pkg-server
    ```
3. Run `sync-pkg-server` to sync your packages to pacano server.
4. Add your new mirror at the top of your mirrorlist files as
    ```
    Server = <Your Repo URL>/$repo
    ```

Give some time to pacano to sync packages. Then you can use `pacman -S` to download package from your local mirror. 

If you need to add newly installed package in your system to be avilable to pacano mirror, just run `sync-pkg-server` again.

# Environment Variables
`ADMIN_TOKEN`: A random token to authorize your pc to pacano server. This value should match `ADMIN_TOKEN` in `pc-scripts/sync-pkg-server.py`.

`MIRRORDIR`: Where mirrored repositories will be stored. Note: This directory must have write permission.

`PORT`: pacano server port

`SYNC_INTERVAL`: How often should pacano sync upstream in seconds

`LOG_LEVEL`: Logging level for pacnao server

`LOG_FILENAME`: Logging filename for pacano logs

`UPSTREAM_MIRRORS`: Upstrem mirrorlist file to use (e.g.: `mirrors.json`)

# ISSUES
This is very early stage of the program. It might be very buggy. You are always welcome to [create an issue](https://github.com/rafiibrahim8/pacano/issues) or [submit a pull request](https://github.com/rafiibrahim8/pacano/pulls).

[License-shield]: https://img.shields.io/github/license/rafiibrahim8/pacano
[License-url]: https://github.com/rafiibrahim8/pacano/blob/main/LICENSE
