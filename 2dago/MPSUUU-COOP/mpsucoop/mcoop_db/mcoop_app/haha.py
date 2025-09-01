def subset(nums:list[int]) -> list[list[int]]:
    res , sol = [], []
    l = len(nums)
    def backtrack(n):
        if n >= l :
            res.append(sol[:])
            return
        backtrack(n + 1)

        sol.append(nums[n])
        backtrack(n + 1)
        sol.pop()


    backtrack(0)
    return res


print(subset([1,2,3]))