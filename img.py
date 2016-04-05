f = open("index.html", "r+")

write_file = ""
while(True):
    line = f.readline();
    if line.find('src="images') != -1:
       parts = line.split('src="')
       write_file += parts[0] + 'src="http://www.weepower.net/' + parts[1]
       print(parts[0] + 'src="http://www.weepower.net/' + parts[1])
    else:
        write_file += line + "\n"
    
    if line == "":
        break

f.write(write_file)
f.close()
