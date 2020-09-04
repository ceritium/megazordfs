# MegazordFS

Fuse based filesystem that creates a virtual volumen backed by several devices.

Yes, like the megazord.

![Megazordfs gif](../media/megazordfs.gif?raw=true)

## WARNING

It is a working progress project in a very early stage of development, if you use it you can loose your files.

## Install

$ npm install -g megazorfs

You also need to install fuse. See [this link](https://github.com/mafintosh/fuse-bindings#requirements) for more info.

```
node cli
node cli volumes create VOL1 blockA blockB # Creatr VOL1 with dummy blocks, in the future it will be the storage
node cli volumes start VOL1 /tmp/megazordfs
```
