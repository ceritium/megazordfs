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
mkdir -p /tmp/blockA /tmp/blockB /tmp/blockC # Creates dummy storage "blocks"

megazordfs --help
megazordfs create VOL1 /tmp/blockA /tmp/blockB /tmp/blockC
megazordfs start VOL1 /tmp/megazordfs
```
