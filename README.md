## Soma Capital Technical Assessment

This is a technical assessment as part of the interview process for Soma Capital.

> [!IMPORTANT]  
> You will need a Pexels API key to complete the technical assessment portion of the application. You can sign up for a free API key at https://www.pexels.com/api/  

To begin, clone this repository to your local machine.

## Development

This is a [NextJS](https://nextjs.org) app, with a SQLite based backend, intended to be run with the LTS version of Node.

To run the development server:

```bash
npm i
npm run dev
```

## Task:

Modify the code to add support for due dates, image previews, and task dependencies.

### Part 1: Due Dates 

When a new task is created, users should be able to set a due date.

When showing the task list is shown, it must display the due date, and if the date is past the current time, the due date should be in red.

### Part 2: Image Generation 

When a todo is created, search for and display a relevant image to visualize the task to be done. 

To do this, make a request to the [Pexels API](https://www.pexels.com/api/) using the task description as a search query. Display the returned image to the user within the appropriate todo item. While the image is being loaded, indicate a loading state.

You will need to sign up for a free Pexels API key to make the fetch request. 

### Part 3: Task Dependencies

Implement a task dependency system that allows tasks to depend on other tasks. The system must:

1. Allow tasks to have multiple dependencies
2. Prevent circular dependencies
3. Show the critical path
4. Calculate the earliest possible start date for each task based on its dependencies
5. Visualize the dependency graph

## Submission:

1. Add a new "Solution" section to this README with a description and screenshot or recording of your solution. 
2. Push your changes to a public GitHub repository.
3. Submit a link to your repository in the application form.

# Solution: 
Video Demonstration 
https://drive.google.com/file/d/1eAHKz6L6N3dgc5aWqf-fg6ICeaVMVK7V/view?usp=sharing
### Part 1: 
**Note: I changed due date to highlight red if the earliest possible finish time was after the due date (seemed a lot more useful)**
### Part 2: 
I added .env files and you will need to add your own pexel key if you want to run that locally 
### Part 3: 
1. 1 click to add the selected todo as a parent and 2 clicks to add the selected todo as a child
2. cycles are detected and a toast error is thrown before db write--allowing the user to fix their mistake
3. critical path is highlighted in red
4. earlist possible start date and earliest possible end date arre both displayed 
### future improvments 
1. improve delete logic (if you delete a parent with multiple children you get unexpected behavior)
2. have earliest finishes adjust for weekends and holidays (code is built to easily be extended this way)
3. have clearer db names for workUnits and dependency relations
4. allow for editing of existing relations 

Thanks for your time and effort. We'll be in touch soon!
