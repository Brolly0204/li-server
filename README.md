# li-server
> 一个用nodejs编写的静态文件服务器 功能如下：

- 读取静态文件
- MIME类型支持
- 缓存支持/控制
- 支持gzip压缩
- 只能访问指定目录, 不能访问指定目录的上级目录，保证安全
- 访问目录可以自动寻找下面的index.html文件
- Range支持，断点续传
- 发布为可执行命令并可以后台运行,可以通过npm install -g安装

## Install
```
npm i -g li-server
```

## Usage
```
li-server [options]

```
## Example
```
li-serever [-p 9090] [-o localhost] [-d /root]

#浏览器打开
http://localhost:9090
```
## options

- -p 指定端口
- -o 指定主机名
- -d 指定服务根目录 

